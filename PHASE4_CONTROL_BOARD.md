# IntelGraph — Phase‑4 Control Board

*Date:* **Sun Aug 24, 2025**  •  *TZ:* America/Denver  •  *Owner:* Platform & SecOps

---

## 0) TL;DR

**Do now (next 90 minutes):**

1. Start **merge train** from newest → oldest with conflict rules below.
2. Enforce CI gates: **coverage ≥ 70% server / 60% client**, **Playwright golden path** green, **OPA deny-by-default** on.
3. Deploy **prod Helm values** (EKS/GKE/AKS variants) with secrets via **GitHub OIDC → cloud KMS**.
4. Run **Smoke Test** + **k6 perf** (3-hop query **p95 < 1.5s**).
5. Enable **Elastic SIEM** (GA) with **Splunk HEC behind feature flag**.

**This sprint (2 weeks):** lock GraphQL ⇄ **prov-ledger** ⇄ **graph-xai** integration with **verifiable export**; finish observability SLOs; execute **Red Team Campaign v1** (defensive, rules-based).

---

## 1) Release Engineering — Merge Train (latest → oldest)

**Labels:** `merge/train`, `risk/high`, `needs/decision`, `db/migration`, `feature/flagged`.
**Order:** latest timestamp first; process `db/migration` PRs in isolation.

**Conflict rules:**

* Prefer **type-safe** TS/Go implementations over legacy JS/py shims; keep both behind flags for 1 sprint if needed.
* If GraphQL schema conflicts: **union additive**, never destructive; emit `@deprecated(reason)` for removals.
* UI collisions: prefer **feature-flag path** (`FF_INTELGRAPH_V2`), dark-ship behind `% rollout`.

**Commands (illustrative):**

```bash
# 0) Fresh base
git switch main && git pull --ff-only origin main

# 1) Create comprehensive merge branch
BR=comprehensive/phase4-merge
git switch -c "$BR"

# 2) Queue newest-first PRs
gh pr list --state open --sort created --limit 200 --json number,headRefName | jq -r '.[].headRefName' > /tmp/queue

# 3) Merge loop (semantic, no-ff; resolve conflicts with ours/theirs policy snippets)
while read BRN; do
  git fetch origin "$BRN" && git merge --no-ff "origin/$BRN" || {
    # invoke resolver scripts (ts-logger, graphql schema, opa bundle, helm values)
    ./tools/queue/resolve.sh || exit 1
    git add -A && git commit -m "merge($BRN): resolved via resolve.sh"
  }
  ./tools/queue/run-ci-local.sh || exit 1
done < /tmp/queue

# 4) Open PR for comprehensive branch
gh pr create -B main -H "$BR" -t "Phase‑4 comprehensive merge" -b "All PRs merged latest→oldest with CI gates."
```

**CI Gates:**

* Jest/Vitest green; **coverage thresholds** enforced: `server:70% | client:60%`.
* Playwright **golden path**: login → query → XAI explain → export → logout.
* `rego` tests must pass; **OPA deny-by-default** with user-facing denial reason.
* k6 perf check (see §4).

---

## 2) Config & Deploy Targets (Helm values)

**Targets:** **EKS**, **GKE**, **AKS** (all supported).
**Datastores:** Managed **Postgres** (Aurora/GCloudSQL/AzureDB), Managed **Neo4j**.
**Secrets:** **GitHub OIDC → cloud KMS**; no static long‑lived keys.

**Values keys (excerpt):**

```yaml
intelgraph:
  featureFlags:
    elasticSiem: true
    splunkHec: false      # enable per-tenant if needed
    denyByDefault: true
  tenancy:
    idStrategy: slug      # tenant/<slug>
  security:
    opa:
      bundleUrl: https://bundles.intelgraph/tenant/{{ .Values.intelgraph.tenancy.id }}/policy.tar.gz
      decision: "authz/allow"
  exports:
    verifiable:
      enabled: true
      sink: s3://intelgraph-evidence/prod
  graph:
    xai:
      enabled: true
  provenance:
    immutableAudit: true
```

---

## 3) Security Controls (ABAC/OPA, License/Authority, SIEM)

**Policy stance:** **Deny by default**, explain *why* to the user.

**Rego (minimal example):**

```rego
package authz

default allow = false

allow {
  input.user.authenticated
  input.action in allowed_actions[input.user.role]
  input.tenant == input.user.tenant
}

allowed_actions := {
  "viewer": {"read"},
  "analyst": {"read", "query", "export"},
  "admin": {"read", "query", "export", "write"}
}

violation_reason := reason if not allow
reason = {
  "message": "Access denied by policy.",
  "tenant": input.tenant,
  "role": input.user.role,
  "action": input.action
}
```

**License/Authority enforcement:** gate privileged actions behind `has_authority(user, capability, tenant)`; log every decision to immutable audit stream.

**SIEM:** **Elastic** as GA sink; **Splunk HEC** behind `featureFlags.splunkHec`. Map OPA, GraphQL, and export events to ECS.

---

## 4) Performance Budget (k6)

*Target:* **3-hop query p95 < 1.5s**, error rate < 0.5%.

```js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { thresholds: { http_req_duration: ['p(95)<1500'], http_req_failed: ['rate<0.005'] }, vus: 25, duration: '3m' };
export default function () {
  const q = `{ threeHop(entity:"acct:123", depth:3){ id score edges{ id w } } }`;
  const r = http.post(__ENV.GRAPH_URL, JSON.stringify({query:q}), { headers: { 'Content-Type': 'application/json', 'Authorization': __ENV.TOKEN } });
  check(r, { '200': (res)=>res.status===200, 'has edges': (res)=>JSON.parse(res.body).data.threeHop.edges.length>0 });
  sleep(0.5);
}
```

---

## 5) Smoke Test (curl)

```bash
# 1) Health
curl -sf "$API/healthz"
# 2) Auth (OIDC device flow)
# ... obtain $TOKEN
# 3) GraphQL ping
curl -s "$API/graphql" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"query":"{ me { id roles tenant } }"}' | jq .
# 4) XAI explain
curl -s "$API/graphql" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"query":"{ explain(node:\"acct:123\"){ rationale provenance } }"}' | jq .
# 5) Verifiable export
curl -s -X POST "$API/export/verifiable" -H "Authorization: Bearer $TOKEN" -d '{"caseId":"demo-001"}' | jq .
```

---

## 6) Verifiable Export: prov-ledger ⇄ graph-xai ⇄ GraphQL (one flow)

**Sequence (high level):**

1. GraphQL mutation `exportVerifiable(caseId)`
2. **graph-xai** produces explanation bundle + evidence refs
3. **prov-ledger** signs bundle, appends to immutable log, returns `manifestHash`
4. Exporter writes `{ bundle, manifest.json, hash.txt }` to object store
5. UI shows downloadable **evidence pack** w/ checksum

**Manifest (excerpt):**

```json
{ "caseId":"demo-001", "hash":"SHA256:...", "xai":{"model":"gpt‑xai‑v3","explainVersion":"1.2"}, "provenance":[{"event":"policy.allow","opa":"sha256:..."}] }
```

---

## 7) Observability & SLOs

| SLI            | SLO      | Alert          | Notes            |
| -------------- | -------- | -------------- | ---------------- |
| GraphQL p95    | < 800 ms | 5m burn 14x    | Golden path only |
| 3-hop p95      | < 1.5 s  | 10m burn 6x    | see §4           |
| 5xx rate       | < 0.25%  | 5m > threshold | per-tenant       |
| Auth success   | > 99.5%  | 15m < target   | OIDC             |
| Export success | > 99%    | 30m < target   | evidence flow    |

---

## 8) Phase‑4 Sprint Plan (2 weeks)

**Epics:**

* **E1. Comprehensive Merge & Hardening**

  * Resolve logger shadowing (TS) across server/realtime/db
  * Enforce CI gates; add Playwright golden path
  * Helm prod values per cloud; secrets via OIDC→KMS
* **E2. Prov‑Ledger + Graph‑XAI + UI Export**

  * Wire GraphQL mutations; sign & manifest; UI download
  * Evidence pack checksum + audit trail link
* **E3. OPA ABAC & License/Authority**

  * Deny-by-default; reason payloads; rego tests; bundle path `tenant/<slug>`
* **E4. Observability & SIEM**

  * Elastic ECS mapping; Splunk flag; SLO alerts; dashboards
* **E5. Perf & Scale**

  * k6 tests; read replica plan for Neo4j/Postgres; cache warmers
* **E6. Red Team Campaign v1 (defensive)**

  * DAST, phishing-sim (consented), RBAC bypass attempts, supply-chain drill

---

## 9) Red Team Campaign Kit (defensive & rules‑based)

**Scope:** staging + controlled prod tests; **consent, ROE, change window** required.
**Test matrix:** authz bypass, IDOR, GraphQL injection, schema introspection, audit log tamper attempts, export replay, bundle poisoning (should fail sig check), OIDC misconfig.
**Deliverables:** findings report, repro steps, severity, fix PR links, retest evidence.

---

## 10) TimescaleDB: immutable audit (sketch)

```sql
CREATE TABLE audit_events (
  ts TIMESTAMPTZ NOT NULL,
  tenant TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  object TEXT NOT NULL,
  allow BOOLEAN NOT NULL,
  reason JSONB NOT NULL,
  hash TEXT NOT NULL
);
SELECT create_hypertable('audit_events','ts');
```

---

## 11) Jira Import CSV (seed epics & stories)

```csv
Issue Type,Summary,Description,Parent,Labels
Epic,E1: Comprehensive Merge & Hardening,Merge train + CI gates,,phase4
Story,Set coverage gates server 70% / client 60%,Configure and enforce thresholds,E1,qa
Story,Add Playwright golden path,Login→Query→Explain→Export→Logout,E1,qa
Story,Helm prod values for EKS/GKE/AKS,Secrets via OIDC→KMS,E1,devops
Epic,E2: Prov‑Ledger + Graph‑XAI + UI Export,Verifiable export end‑to‑end,,phase4
Story,GraphQL mutation exportVerifiable,Wire endpoints + contracts,E2,backend
Story,Sign manifest + checksum,Integrate prov‑ledger,E2,security
Story,UI evidence pack download,Expose manifest + hash,E2,frontend
Epic,E3: OPA ABAC & License/Authority,Deny-by-default with reasons,,phase4
Story,Bundle path tenant/<slug>,Rewire OPA bundle loader,E3,security
```

---

## 12) Release v1.1.0 Checklist (ship when all green)

* [ ] All CI gates pass on **main** and **comprehensive merge** branch
* [ ] OPA deny-by-default active; reasons visible
* [ ] Elastic SIEM receiving logs; Splunk flag toggled in staging
* [ ] Evidence export verified (manifest hash matches)
* [ ] k6 perf target met; SLO dashboards show green
* [ ] Cut **TAG v1.1.0**, publish Release Notes

---

### Appendix — Tooling Paths

* Resolver scripts: `tools/queue/resolve.sh`, `tools/queue/run-ci-local.sh`
* Policies: `policy/opa/*.rego`
* Helm: `deploy/helm/intelgraph/values-*.yaml`
* Tests: `tests/playwright/golden.spec.ts`, `tests/k6/threehop.js`

