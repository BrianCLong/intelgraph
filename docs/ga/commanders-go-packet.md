---
title: Commander’s GO Packet — IntelGraph GA
date: 2025-08-24
owner: Incident Commander (IC)
audience: Exec, SRE, Security, Product
---

## 0) Executive Order
GO for IntelGraph GA with rails: provenance gate, authority minimization, separation invariants, offline drill.

## 1) C2 Roster
- IC, Deputy IC, SRE Lead, Security Lead, Product Lead, Comms Lead; pager tree attached.

## 2) Day‑0 Checklist
- Enable canary (5%); confirm helm/values‑canary.yaml applied.
- Run k6 smoke; verify Prom alerts quiet; error budget intact.
- Load OPA export guard; test denial reason and appeal link.
- Verify cosign signatures and server SBOM attestation.

## 3) Golden Signals & SLOs
- p95 graph query ≤1.5s (3‑hop path); error budget burn <2% over 15m; cost budgets within ceilings.

## 4) Abort & Rollback
- Kill switch criteria: isolation breach, provenance falsification, sustained error burn, compliance blocker, offline resync corruption.
- Rollback: redeploy previous IMAGE_TAG via verified pinned deploy workflow.

## 5) Day‑0→Day‑7 Timeline
- T‑0: canary + smoke; quiet burn.
- T+1h: OPA denial test (human reason + appeal); provenance CLI on real bundle.
- T+6h: Golden prompts ≥95%; citations resolvable.
- T+24h: Chaos (non‑stateful worker); autoscaling verified.
- T+48h: Offline case sync round‑trip; signed resync logs.

## 6) Smoke Tests
- HTTP /health; GraphQL persisted query; Cypher acceptance script; provenance CLI verification.

## 7) Residual Risk Register
- Isolation drift; offline sync edge cases; dependency CVEs; cost spikes — owners and mitigations listed.

## 8) Comms Plan
- Channels: war‑room, exec updates, customer bulletins. Cadence: T‑0, T+1h, T+6h, T+24h, T+48h.

## 9) Evidence & Audit Capture
- Preserve dashboards, SSM logs, manifests, attestations, OPA decisions; attach to post‑launch package.

## 10) Post‑Launch Success
- SLOs met; canary to full; appeals processed; no unresolved Sev‑1/2; audit pack complete.

## 11) Exception Policy
- Temporary relaxations require IC + Security approval; expiry ≤24h; logged.

## 12) Sign‑offs
- IC, Security, SRE, Product, Legal.

## 13) Appendices
- Links: GA Gates workflow, canary values, OPA bundle, Prom rules, provenance CLI, SBOM attestation guide.

## Dissent‑by‑Default
Preserve dissent and counterarguments; publish appeal outcomes.

