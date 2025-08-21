/**
 * Simple rule-engine style ABAC scaffolding.
 * Rules are evaluated against user attributes and resource attributes.
 */
const { pbacRoles, jwtIssuer } = require("../config/security.js");
const { pbacDecisionsTotal } = require("../monitoring/metrics.js");

const issuerRule = (ctx) => {
  const { user } = ctx;
  if (jwtIssuer && user?.iss && user.iss !== jwtIssuer) {
    return { allow: false, reason: "Invalid token issuer" };
  }
  return null;
};

const roleRule = (ctx) => {
  const { action, user } = ctx;
  const roles = user?.roles || [];
  for (const role of roles) {
    const perms = pbacRoles[role];
    if (perms && (perms.includes(action) || perms.includes("*"))) {
      return { allow: true };
    }
  }
  if (roles.length > 0) {
    return { allow: false, reason: "PBAC role denied" };
  }
  return null;
};

const defaultRules = [
  issuerRule,
  roleRule,
  // Example: deny access to resources with sensitivity 'high' unless user clearance >= 'secret'
  (ctx) => {
    const { action, user, resource } = ctx;
    const sensitivity = resource?.sensitivity || "low";
    const clearance = user?.clearance || "public";
    const order = ["public", "internal", "confidential", "secret", "topsecret"];
    if (
      sensitivity === "high" &&
      order.indexOf(clearance) < order.indexOf("secret")
    ) {
      return { allow: false, reason: "Insufficient clearance" };
    }
    return null; // no decision
  },
];

async function evaluateOPA(action, user, resource = {}, env = {}) {
  const opaUrl = process.env.OPA_URL; // e.g., http://localhost:8181/v1/data/intelgraph/allow
  if (!opaUrl) return null;
  try {
    const fetch = require("node-fetch");
    const res = await fetch(opaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { action, user, resource, env } }),
    });
    const data = await res.json();
    if (typeof data.result === "boolean") {
      return { allow: data.result };
    }
  } catch (e) {
    // Fallback to rule engine on failure
  }
  return null;
}

async function evaluate(action, user, resource = {}, env = {}) {
  const opa = await evaluateOPA(action, user, resource, env);
  if (opa) {
    pbacDecisionsTotal.inc({ decision: opa.allow ? "allow" : "deny" });
    return opa;
  }
  for (const rule of defaultRules) {
    const res = rule({ action, user, resource, env });
    if (res) {
      pbacDecisionsTotal.inc({ decision: res.allow ? "allow" : "deny" });
      return res;
    }
  }
  pbacDecisionsTotal.inc({ decision: "allow" });
  return { allow: true };
}

/**
 * Compile row-level security predicates for Neo4j queries based on user attributes.
 * Currently supports territory scoping and sensitivity clearance. Returns an
 * object containing a Cypher fragment prefixed with `AND` and the parameters to
 * bind.
 */
function buildRlsPredicate(user = {}) {
  const territories = user.territories || [];
  const clearance = user.clearance || "public";
  const clauseParts = [];
  const params = {};

  if (territories.length > 0) {
    clauseParts.push("n.territory IN $rls_territories");
    params.rls_territories = territories;
  }

  const order = ["public", "internal", "confidential", "secret", "topsecret"];
  const idx = order.indexOf(clearance);
  if (idx >= 0) {
    // Allow access to resources up to the user's clearance level
    params.rls_allowed_sensitivity = order.slice(0, idx + 1);
    clauseParts.push(
      "coalesce(n.sensitivity, 'public') IN $rls_allowed_sensitivity",
    );
  }

  const clause = clauseParts.length ? ` AND ${clauseParts.join(" AND ")}` : "";
  return { clause, params };
}

export { evaluate, buildRlsPredicate };
