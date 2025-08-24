---
title: Executive Go/No-Go Memo & Day‑0 Runbook — IntelGraph GA
date: 2025-08-24
owner: COO (with IC)
audience: Executives, IC, SRE, Security
---

## Go/No-Go Rationale
All GA gates green with rails installed. Residual risks bounded and monitored. Decision: GO.

## Launch Gates & Abort Criteria
- Gates: Prom SLOs loaded; OPA export guard active; k6 p95 smoke pass; Cypher probes pass; provenance CLI verified.
- Abort: isolation breach; provenance falsification; sustained error burn >2%/15m; compliance blocker; offline resync corruption.

## Command Center
- War‑room open; pager tree; roles assigned; status cadence every 30 minutes for first 6 hours.

## Day‑0 Smoke Tests
- /health; GraphQL persisted query; k6 smoke; Cypher acceptance; OPA denial reason; provenance CLI on bundle.

## Rollback Plan
- Execute verified pinned deploy with previous IMAGE_TAG; confirm smoke; widen canary only after quiet burn.

## Residual Risks
- Isolation drift; offline sync edge cases; supply‑chain regressions; cost spikes — owners and mitigations listed.

## Metrics & Alerts
- SLO dashboards; error‑budget and p95 burn alerts; cost budget monitors; policy change audit.

## Comms & Change Mgmt
- Executive updates; customer comms; change log annotated with manifests/attestations.

## Post‑Launch Assurance
- Collect evidence; run chaos and offline drills; publish audit pack at Day‑7.

## Dissent‑by‑Default
Record dissent and preserve countermeasures; appeals documented.

## References
- Commander’s GO Packet; GA Gates workflow; canary values; OPA bundle; Prom rules; provenance CLI.

