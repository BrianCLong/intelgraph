# Phase 4 (2027) — Policy Simulation @ Scale, Cross-Tenant Hashed Deconfliction & Marketplace Maturity

## Objectives & KPIs

**Policy Simulation at Scale (GA)**
- Simulate historical and live queries under candidate policies.
- Produce diffs, impact reports and appeal paths.
- **KPIs:** ≥10M queries/day; p95 simulation run <5s per policy; zero silent denials (every block explains "why").

**Cross-Tenant Hashed Deconfliction (CTHD) (GA)**
- Privacy-preserving collision checks across tenants/services using hashed selectors.
- Auditable, opt-in, and bound to lawful basis.
- **KPIs:** ≥0.95 precision on true matches with false-positive ≤0.01; no raw selector egress.

**Marketplace Maturity**
- Vetted connector marketplace & partner tiers with conformance checks and license/TOS enforcement.
- **KPIs:** 50+ vetted connectors; 100% license manifests; golden IO tests pass.

## Scope & Deliverables

### Policy Simulation Service (PSS)
- Replays past queries under candidate policy and diffs results.
- Generates impact reports and justification text.
- **Components**
  - Replay worker with Kafka backlog reader and parallel diff engine.
  - Impact analyzer that aggregates blocked queries, cost deltas and appeal surfaces.
  - Provenance ledger writer storing policy, data source and legal basis per decision.
- **APIs**
  - `POST /policy-simulations {policyId,candidateRules,window} → simId`
  - `GET /policy-simulations/:simId/report → {blocks, diffs, affectedUsers, costs, appealPaths}`
- **UI**: Simulation console in Admin Studio with replay logs, graph diffs and "apply with canary" gate.

### CTHD Broker
- Deconfliction across projects/tenants via salted HMAC identifiers and PSI (no raw PI).
- Opt-in, authority-bound, fully audited; aligns with federation roadmap.
- **Components**
  - Hash vault backed by HSM for per-tenant salts and rotation policies.
  - PSI service producing zero-knowledge proofs and k-anon buckets.
  - Audit trail writer emitting immutable access logs and review hooks.
- **APIs**
  - `POST /cthd/check {tenantToken, selectorHashes[]} → {collisions[], proofs[]}`
  - `POST /cthd/register {authority, purpose, hashes[]} → receipt w/ retention class`

### Federated Multi-Graph Search (Hardening to GA)
- Query planner across case-scoped graph partitions and external partner graphs.
- Policy/label aware; provenance maintained.

### Connector Marketplace & Partner Tiers
- Listings with manifests, rate limits, license classes and conformance tests.
- Partner vetting and SDKs.
- Certification pipeline auto-runs golden IO tests and license scans on every update.
- Tiered marketplace (community, vetted, premium) with usage analytics and revenue share hooks.

## Architecture
```
[Apps/Web] ──GraphQL Gateway──┐
                             │
                      [OPA/ABAC/Policy Engine]
                             │
                ┌────────────┴────────────┐
                │                         │
     [Policy Simulation Svc]      [CTHD Broker]
        │  OTEL, Kafka                │  OTEL, Kafka
        │  Prov-Ledger                │  Hash Vault (HSM)
        │                              │  PSI/Proof Svc
        └───────› [Reports/Impact]     └────› [Collision Proofs]
                             │
                   [Federation Gateway]
                             │
                [Tenant Graphs]…[Partner Graphs]
```
Prov-Ledger & authority binding ensure every block/allow cites source, license and legal basis at query time.

## Data Contracts
```graphql
# Policy Simulation
 type PolicySimulation {
   id: ID!
   candidate: PolicyDraft!
   window: TimeWindow!
   status: SimStatus!
   impact: ImpactReport
   createdAt: DateTime!
 }

 type ImpactReport {
   blockedQueries: [BlockedQuery!]!
   affectedUsers: [UserImpact!]!
   policyDiff: [PolicyDiff!]!
   appealPaths: [AppealPath!]!
 }

# Deconfliction
 type CTHDCheckRequest {
   authorityId: ID!    # warrant/legal basis
   purpose: Purpose!
   selectorHashes: [Base64!]!  # HMAC_salt(selector)
 }

 type CTHDCheckResult {
   collisions: [Collision!]!
   proofs: [PSIProof!]!        # zero-knowledge proof receipts
 }
```

## Privacy & Protocols (CTHD)
- **Hashing:** HMAC-SHA-256 with per-tenant rotating salts (kept in HSM).
- **PSI layer:** ECDH-based private-set-intersection (or Cuckoo-filter PSI) revealing only intersections.
- **Noise & k-anon:** Thresholded reporting; bucket sizes ≥k; retention/basis tags on artifacts.
- **Audits:** Immutable logs with reason-for-access prompts; ombuds review queue.
- **Data minimization:** Retention classes applied at registration; selectors aged-out automatically when lawful basis expires.

## Acceptance Criteria
- **Policy Sim GA:** For a 180-day window of ≥10M queries, simulator produces differences report with block reasons & appeal paths; operators can canary a policy and auto-rollback; no uncited block events.
- **CTHD GA:** Cross-tenant check reveals only hashed collisions with proof receipts; privacy tests show no selector leakage; ombuds reviewable trail.
- **Marketplace:** Each connector ships manifest+mapping, sample data and golden IO tests; license/TOS engine blocks disallowed exports with human-readable reasons.

## Milestones & Timeline (illustrative 4 quarters)
- **Q1:** Specs & threat models; PSS MVP (offline batch); CTHD crypto modules + vault; Marketplace scaffolding.
- **Q2:** PSS "canary apply"; federation query planner v2; PSI proofs; connector conformance CI.
- **Q3:** Scale tests (10M/day); ops runbooks; ombuds workflows; partner onboarding.
- **Q4:** GA hardening; chaos drills; compliance attestation; documentation & training packs.

## Testing & Ops
- **Load/Chaos:** k6 for simulator throughput; broker soak tests; pod/broker kill drills with auto-remediation.
- **Security:** STRIDE matrix; step-up auth (WebAuthn) for sensitive ops; quarterly red-team; zero criticals.
- **Observability:** OTEL traces; SLO dashboards; cost guard alerts; divergence reports for federation.
- **Runbooks:** Playbooks for simulator rollback, salt rotation and connector revocation kept in versioned docs.
- **Alerts:** PagerDuty hooks for policy drift, PSI error rates and marketplace abuse signals.

## Implementation Notes
- **Branches:** `feature/policy-sim`, `feature/cthd-broker`, `feature/federation-ga`, `feature/marketplace`.
- **CI gates:** schema diff checks, federation planner tests, PSI proof verifiers, policy sim golden outputs.
- **Docs:** admin runbooks (Policy Change Simulation, Audit Closure Sprint), partner SDK quickstarts.
- **Tooling:** pre-commit hooks enforce lint/format; `npm run test:e2e` for cross-tenant flows; coverage ≥80% on touched modules.

## Risks & Mitigations
- **PSI scale limits:** benchmark with progressively larger selector sets; shard brokers horizontally with consistent hashing.
- **Policy drift:** nightly diff runs against production policy; alert on unexpected block deltas.
- **Marketplace abuse:** anomaly detection on connector usage; automatic quarantine pending human review.

## Open Questions
- Should marketplace billing integrate with existing usage-based billing engine or remain separate at launch?
- What retention window satisfies both privacy laws and investigative usefulness for collision proofs?

Alignment: Supports Wishbook roadmap 2027 targets and long-term federation work.
