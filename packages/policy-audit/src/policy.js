import fs from 'fs';
import path from 'path';

function loadPolicies() {
  const file = path.resolve('contracts/policy/abac.rego');
  const data = fs.readFileSync(file, 'utf8');
  return JSON.parse(data);
}

function matches(rulePart, inputPart = {}) {
  return Object.entries(rulePart || {}).every(([k, v]) => inputPart[k] === v);
}

export function evaluate(input, policies = loadPolicies()) {
  for (const rule of policies) {
    if (
      matches(rule.subject, input.subject) &&
      matches(rule.resource, input.resource) &&
      (!rule.action || rule.action === input.action) &&
      matches(rule.context, input.context)
    ) {
      return { allow: rule.decision === 'allow', reason: rule.reason };
    }
  }
  return { allow: false, reason: 'no matching policy' };
}
