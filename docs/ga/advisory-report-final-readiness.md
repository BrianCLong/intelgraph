---
title: IntelGraph GA Launch — Final Readiness Validation | IntelGraph Advisory Report
date: 2025-08-24
owner: IntelGraph Advisory Council (Chair: Guy IG)
audience: Exec, SRE, Security, Legal, Product
---

## Consensus Summary
Unanimous GO with guardrails. Dissents recorded: Starkey, Foster, Oppie. Evidence‑first framing; no external accuracy claims without manifests and reproducible validation.

## Individual Commentaries
- Elara Voss: Approve with provenance hard‑gate; surface appeal path on denials.
- Starkey (dissent): Delay 48h; prove cross‑tenant chaos with live traffic.
- Foster (dissent): Add dual‑control on export of multi‑tenant bundles.
- Oppie (dissent): Require signed resync logs before external publications.
- 11‑persona chorus: “Provenance before prediction; disclose proofs, not promises.”
- Magruder: Keep command chain short; publish pager tree.
- Stribol: Pre‑arm triage with p95 and burn alerts; don’t chase vanity metrics.

## Chair Synthesis (Guy IG)
Launch with the rails specified; zero‑delay actions below, then verify. Evidence prevails over assertion.

### Action Steps (zero‑delay)
- Enable GA Gates workflow on release branch.
- Mount OPA export guard and canary Prom rules.
- Run k6 p95 smoke; confirm burn alerts quiet.
- Verify provenance CLI on a real bundle.

## Risk Matrix
- Isolation drift: medium likelihood, high impact → continuous policy tests.
- Provenance gaps: low likelihood, high impact → block exports; audit manifests.
- Offline sync faults: medium likelihood, medium impact → drill and attest logs.
- Cost spikes: medium likelihood, medium impact → budgets and auto‑alerts.

## Prove‑It Snippets
- Cosign verify images and SBOM attestation.
- OPA input returns deny with human reason on restricted sources.
- k6 p95 < 1.5s at 3 hops; gates enforced.
- Cypher probes execute against acceptance script.

## Launch Gates
- GA Gates green; Prom rules active; OPA export guard loaded; provenance CLI passes.

## Sequence (PlantUML)
```
@startuml
actor Deployer
participant CI as CI/GitHub
participant Registry as GHCR
participant SSM
participant Host
Deployer -> CI: release-build-sign (IMAGE_TAG)
CI -> Registry: push+sign images
CI -> CI: publish image-tags artifact
CI -> CI: release-to-deploy (workflow_run)
CI -> SSM: send-command with IMAGE_TAG
SSM -> Host: write .env (REPO, IMAGE_TAG)
Host -> Host: compose up -d
Deployer -> Host: smoke /health, GraphQL
@enduml
```

## Wording to Soften
- Replace “guarantee” with “validated on internal sets; externally verifiable via manifests.”
- Avoid “safe” unqualified; prefer “guardrails enforced; residual risks listed.”

## Dissent‑by‑Default
Recorded dissents preserved; appeal paths documented; policy changes require simulated review.

