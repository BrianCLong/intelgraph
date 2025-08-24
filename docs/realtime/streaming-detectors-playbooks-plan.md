# Streaming Detectors, Watchlists & Playbooks Implementation Plan

## 1. Foundations

- **Event schema & Kafka topics**
  - Define protobuf/JSON schemas carrying: `tenantId`, `entityId`, `caseId?`, event type, timestamp, payload hash.
  - Topics: `graph.deltas`, `events.raw`, `alerts`, `incidents`, `playbook.exec` partitioned by `tenantId` + `entityId`; regional isolation enforced.
- **Dev environment**
  - Docker Compose for Kafka, Redis, PostgreSQL, Neo4j.
  - Shared TypeScript config and utilities packages (e.g., Kafka client, OPA client).

## 2. Detection Service (`services/detect/`)

- **Rules DSL**
  - YAML parser, JSON Schema validation, CLI command `ig-detect validate`.
  - Support cypher, stream/CEP, ML detectors; `when`, `then`, `policy` blocks.
- **CEP Engine**
  - Windowing (sliding/tumbling) and join keyed on `(tenantId, entityId)`.
  - Rate‑limit/suppression per entity; replay/backfill from offsets.
- **Cypher executor**
  - Batched window execution against Neo4j read replicas.
  - Cost ceilings via `dbms.transaction.timeout` and `dbms.max_read`.
- **ML detector wrapper**
  - Python sidecar interface; expose rationale strings for XAI.
- **Alert/incident persistence**
  - PostgreSQL models for `Alert`, `Incident`, `DetectorRun`.
  - Kafka producer for downstream topics.
- **Correlation module**
  - Entity overlap/time proximity clustering with learned similarity option.

## 3. Playbook Service (`services/playbooks/`)

- **YAML playbook parser → deterministic state machine**
  - Steps: `cypher`, `http`, `graphql`, `enrichers`, `case.create`, `notify.*`.
  - Idempotency keys, retries with backoff, DLQ & requeue.
- **Integrations**
  - Slack, email, generic webhook (MVP); stubs for WHOIS/DNS.
- **Governance**
  - OPA policy checks per step; record reason‑for‑access.
  - WebAuthn approval step for destructive actions (e.g., quarantine).
- **CLI `ig-playbook`**
  - `run`, `validate`, `put` subcommands.

## 4. GraphQL Layer (`server/graphql/detect/`)

- **Schema additions**
  - Types: `Detector`, `DetectorRun`, `Alert`, `Incident`, `Playbook`, `PlaybookRun`, `SLA`.
  - Queries, mutations (e.g., `putDetector`, `runPlaybook`), subscriptions (`alertStream`, `playbookRunProgress`).
- **Resolvers & auth**
  - JWT + ABAC/RBAC + tenant scoping.
  - Propagate OTEL spans and policy decisions.

## 5. UI (`apps/web/src/features/alerts/`)

- **Alert Inbox**
  - React + MUI lanes by severity, saved filters, SLA timers.
  - jQuery‑powered row virtualization and draggable triage drawer.
  - Keyboard shortcuts (`a`, `r`, `m`, `s`).
- **Incident view**
  - Correlation graph, timeline, playbook history.
- **Triage panel**
  - XAI “why fired” widget, run/simulate rule, inline playbook runner.

## 6. Command-Line Tools

- **`ig-detect`**
  - `validate`, `put`, `simulate`.
- **`ig-playbook`**
  - `run`, `put`, `list`.
- Shared auth/config flags, progress bars, JSON/TTY output modes.

## 7. Observability & Governance

- OTEL tracing across detector → alert → playbook.
- Prometheus metrics: eval/s, alert/s, incident MTTR, playbook success rate.
- Logging & provenance: reason-for-access, policy decisions, user actions.
- Runbooks & Grafana dashboards for Kafka lag, error budgets.

## 8. Testing Strategy

- **Unit tests**
  - Rules parsing, window math, suppression, correlation.
- **Contract tests**
  - Playbook step adapters with golden fixtures.
- **E2E**
  - Kafka → alert → incident → playbook → case creation (Playwright UI flow).
- **Performance**
  - k6 on detector endpoints: throughput ≥50k events/s per shard, p95 latency ≤2 s.
- **Backfill determinism**
  - Replay 24h offsets; verify alert parity with live run.

## 9. Deployment & CI/CD

- Helm charts for detect/playbook services with HPA based on lag/run queue.
- **GitHub Actions**
  - Lint, unit, e2e, perf smoke, helm‑lint.
- **Environment variables & secrets**
  - `.env` template; OPA policy bundles per environment.
- **Release**
  - Versioned Docker images; migration scripts; documentation.

## 10. Milestones & Sequencing

- **M1 – Foundations & DSL**: event schemas, rules parser, CLI validate/simulate.
- **M2 – CEP & Cypher detectors**: windowing, suppression, Neo4j integration.
- **M3 – Alert store & correlation**: PostgreSQL models, incident grouping.
- **M4 – Playbook engine**: YAML → state machine, integrations, CLI.
- **M5 – GraphQL & UI**: schema/resolvers, Alert Inbox & triage UX.
- **M6 – Observability & governance**: OPA, OTEL, metrics, dashboards.
- **M7 – E2E & perf hardening**: deterministic backfill, ≥50k events/s tests.
- **M8 – GA readiness**: Helm, CI/CD, runbooks, acceptance criteria verification.

This plan provides a roadmap for delivering the full Streaming Detectors & Playbooks capability while satisfying performance, governance, and UX requirements.
