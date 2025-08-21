# IntelGraph GA Closeout Brief

This document outlines the remaining gaps, deliverables, and execution plan required to ship **IntelGraph GA v1.0**. It aligns to the Wishbook GA core scope (A–D + F minimal).

## 0) Gaps to Close (delta to GA)

### A. Data Intake & Prep

- **Connector MVP** (must): CSV/Parquet, HTTP pull w/ auth, S3/GCS; Kafka optional.
- **Ingest Wizard**: schema mapping → canonical entities; PII classifier; DPIA/redaction presets.
- **Streaming enrichers**: GeoIP, lang detect, NER; EXIF scrub+OCR queue.
- **License registry**: block disallowed sources; tag license on ingest.

### B. Canonical Model & Graph Core

- Canonical entity/relationship set finalized + migration.
- Entity Resolution (ER): deterministic + probabilistic; explainability panel + manual reconcile queue.
- Temporal versioning (validFrom/validTo) + snapshot-at-time queries.
- Provenance chain (source→assertion→transforms) on every node/edge.
- Policy tags (origin/sensitivity/clearance/legal-basis).

### C. Analytics & Tradecraft (MVP)

- Link-analysis canvas (pivot, filter, pinboard, annotations).
- Pathfinding: shortest, K-paths, time-window filter.
- Community/Centrality: Louvain + betweenness with explainers.
- Risk scoring: pluggable detectors + triage queue.
- Hypothesis workbench (claims, weights, competing hypotheses).

### D. AI Copilot (Auditable)

- NL→Cypher with preview + sandbox; RAG over case corpus with inline citations.
- ETL assistant for field mapping/dedupe; guardrails that explain denials.

### F. Security/Governance (minimal for GA)

- Multi-tenant isolation, ABAC/RBAC via OPA/PBAC; tenant-scoped secrets.
- OIDC/JWKS SSO, optional WebAuthn/FIDO2 for step-up.
- Comprehensive audit (who/what/why/when), reason-for-access prompts.
- K-anonymity/redaction toolkit at query+export.
- Crypto: per-tenant envelope encryption; field-level for sensitive PII.

### Ops/SRE (baseline for GA)

- /healthz, /readyz, /metrics, OpenTelemetry traces; SLO dashboards.
- Cost-guard (depth/complexity/timeout limiter; slow-query killer).
- Backup/Restore/DR runbooks + PITR verification.
- CI/CD: SAST/DAST, SBOM, container scan; k6 perf gates.
- Docs: Runbooks, security model, DPIA templates, ToS/Data License registry.

## 1) Deliverables & Acceptance Criteria

### Performance (1M nodes / 10M edges target)

- p95 GraphQL read ≤ 350 ms, p99 ≤ 800 ms.
- p95 NL→Cypher roundtrip ≤ 1.8 s on warm cache.
- Ingest ≥ 5k rec/s (CSV→graph) sustained.
- Web client FPS ≥ 45 on 5k nodes/7k edges viewport.

### Security/Privacy

- OIDC SSO + RBAC/ABAC enforced on queries, mutations, and fields.
- Audit logs for every mutation & sensitive query with reason-for-access.
- Redaction policies applied at export; provenance manifest included.
- No introspection in prod; persisted queries only; depth & cost limits in place.

### Reliability

- SLO: 99.9% API availability; <0.1% error rate; clean blue/green rollouts; DR restore ≤ 30 min.

### Usability

- Link-analysis canvas + tri-pane (timeline/map/graph) with synchronized brush.
- Copilot produces explainable Cypher + citations.

## 2) Workstreams & Tasks

### WS-1 Data Intake & Prep

- Build connectors (CSV, HTTP, S3/GCS) with schema mapping UI + PII flags.
- Add streaming enrichers (GeoIP/lang/NER) via worker queues.
- License registry + policy tags on ingest; block disallowed sources.
- **Tests**: contract tests for each connector; e2e ingest→graph; PII redaction unit tests.
- **Owner**: Ingest squad → branch `feature/ingest-mvp`.

### WS-2 Graph Core & ER

- Finalize canonical schema; write migration scripts.
- ER service (deterministic+probabilistic) with explainers, manual merge queue.
- Temporal versioning + snapshot queries; provenance chain persisted.
- **Tests**: ER accuracy suite; temporal snapshot correctness; provenance invariants.
- **Owner**: Graph squad → `feature/graph-core-ga`.

### WS-3 Analytics & Canvas

- Cytoscape.js canvas + pinboard/annotations; pathfinding + community/centrality services.
- Risk score framework + triage queues.
- **Tests**: Graph algos correctness; canvas interaction Playwright specs; FPS perf harness.
- **Owner**: UX/Algo squad → `feature/analytics-mvp`.

### WS-4 AI Copilot (Auditable)

- NL→Cypher with preview/sandbox; RAG over case corpus w/ citations.
- ETL copilot for mapping/dedupe; policy-aware guardrails (“reason for denial”).
- **Tests**: gold prompts, citation recall@k, Cypher safety (no write in sandbox); jailbreak suite.
- **Owner**: AI squad → `feature/copilot-auditable`.

### WS-5 Security/Governance

- OIDC/JWKS; PBAC/OPA integration; reason-for-access prompts.
- Comprehensive audit logger (immutable sink + ELK); redaction/K-anonymity toolkit.
- Per-tenant envelope encryption; secret rotation runbook.
- **Tests**: authN/Z integration, field-level deny tests, audit tamper tests, export redaction.
- **Owner**: SecGov squad → `feature/secgov-ga`.

### WS-6 Ops/SRE & GA Readiness

- OTEL traces/metrics; SLO dashboards; cost guards; depth/complexity limiter.
- k6 perf gates; Trivy/Grype scan; CycloneDX SBOM; ZAP DAST baseline.
- Backup/restore drill; DR game day; blue/green & canary Helm charts.
- **Tests**: CI gates enforce perf/security; restore verification; rollout/rollback e2e.
- **Owner**: SRE squad → `feature/ops-ga`.

## 3) Concrete Implementation Sketches

### a) GraphQL cost guard (HTTP & WS)

```ts
// server/src/graphql/validation/costLimit.ts
import { specifiedRules } from 'graphql';
import { createComplexityLimitRule } from 'graphql-validation-complexity';
export const validationRules = [
  ...specifiedRules,
  createComplexityLimitRule(Number(process.env.MAX_COMPLEXITY || 1200), {
    onCost: (cost) => cost > 0 && cost % 200 === 0 && console.warn('cost:', cost),
  }),
];
```

### b) OPA policy (ABAC)

```rego
package intelgraph.authz

default allow = false

allow {
  input.user.role == "ADMIN"
}

allow {
  some tag
  tag := input.resource.policy_tags[_]
  tag == "PUBLIC"
}

deny_reason[msg] {
  not allow
  msg := "Access denied by ABAC policy"
}
```

### c) k6 perf gate (CI)

```js
// perf/k6-read-queries.js
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  vus: 40,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.001'],
    http_req_duration: ['p(95)<350', 'p(99)<800'],
  },
};
export default function () {
  const q = `{"query":"query($id:ID!){entity(id:$id){id name degree}}"}`;
  const r = http.post(__ENV.API + '/graphql', q, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.TOKEN}` },
  });
  check(r, { 200: (res) => res.status === 200 });
  sleep(0.2);
}
```

### d) Playwright “explainable Cypher”

```ts
test('copilot suggests Cypher with citations', async ({ page }) => {
  await page.goto(process.env.APP_URL!);
  await page.getByPlaceholder('Ask anything…').fill('Show orgs linked to ACME last 90 days');
  await page.getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByTestId('cypher-preview')).toContainText('MATCH');
  await expect(page.getByTestId('citations')).toHaveCountGreaterThan(0);
});
```

## 4) CI/CD & Branching

- Branches: `feature/ingest-mvp`, `graph-core-ga`, `analytics-mvp`, `copilot-auditable`, `secgov-ga`, `ops-ga`.
- CI Gates (required to merge): lint+typecheck+unit, Playwright e2e, k6 perf, SAST/DAST, SBOM+scan.
- Release: tag `v1.0.0`, schema freeze, persisted ops snapshot, Helm chart `intelgraph-1.0.0`.

## 5) Artifacts to Attach in PR

- SLO dashboard JSON, k6 results, ZAP report, SBOM (CycloneDX), DR restore proof, DPIA template, Security whitepaper PDF, User/Admin runbooks, GA release notes.

## 6) Success = Greenlight Checklist

- ✅ Perf/SLOs met
- ✅ Security/Audit enforced end-to-end
- ✅ DR drill passed
- ✅ NL→Cypher + citations
- ✅ Canvas+analytics MVP usable
- ✅ Admin & runbooks complete
- ✅ Schema & persisted queries frozen
- ✅ Observability dashboards live

## Revised One-liner Prompt (for Codex ticket)

Deliver IntelGraph GA v1.0 by closing the deltas in Data Intake (connectors+wizard+PII), Graph Core (ER+temporal+provenance+policy tags), Analytics (canvas+paths+community+risk), AI Copilot (NL→Cypher+RAG with citations), and Security/Governance (multi-tenant OIDC+PBAC, audit, redaction, per-tenant crypto). Ship Ops/SRE baselines (OTEL, SLO dashboards, cost guards, DR drill, k6 gates) and full docs/runbooks. Meet perf targets (p95 ≤350 ms reads at 1M/10M), enforce privacy/security (no introspection, persisted queries, field-level auth), and pass CI gates (unit/e2e/perf/SAST/DAST/SBOM). Release as v1.0.0 with schema freeze and Helm chart.
