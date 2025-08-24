---
title: Committee Report — Wolf’s Hand
date: 2025-08-24
owner: GA Council Secretariat
audience: Exec, SRE, Security, Legal, Product
---

# Case IG-GA-2025 • Date: 2025-08-24 • Distribution: Exec, SRE, Sec, Legal, Product

## Problem
Validate “IntelGraph GA Launch – Final Readiness Summary,” decide GO/NO-GO, surface residual risks, and set Day-0/Day-7 guardrails consistent with principles: mission-first ethics, provenance > prediction, compartmentation, interoperability, offline resilience.

## Deliberations (selected voices)
- Sun Tzu: “Win before battle; know self, know adversary.”
- Machiavelli: “Guard the state; bind power with counter‑power.”
- John le Carré: “Trust, but verify; then verify the verifier.”
- Leslie Groves: “Schedule is a weapon; slips are risks.”
- Bobby Inman: “Compartment data; expose usage, not secrets.”
- Kyrylo Budanov: “Act faster than threat cycles.”
- Walsingham: “Intelligence serves sovereignty, not vanity.”
- Richelieu & Cromwell: “Authority must be bounded and observed.”
- James Angleton: “Deceive yourself last.”
- Harel/Kimche: “Admissibility demands chain‑of‑custody.”
- Wild Bill Donovan: “Outcome over ornament.”
- J. Edgar Hoover (guarded): “Account for abuse before it occurs.”
- Yuri Andropov: “Assume opposition adapts; adapt first.”
- Traitors’ Bench (Stauffenberg): “Conscience is a control plane.”

Imperatives (cited): “mission‑first ethics; provenance>prediction; compartmentation; interoperability; offline resilience.”

## Committee Position
GO — with four iron rails:
1) Provenance & Disclosure Gate enforced at export and briefings.
2) Authority Binding & Minimization with audit trails.
3) Tenant Separation invariants verified continuously.
4) Offline/Edge resilience proven by drill.

## Recommendations (Day‑0 → Day‑7)
- Provenance & Disclosure Gate: Block export when license/TOS restrict; attach manifests; verify with CLI.
- License/TOS Enforcement: Show clause, owner, appeal path on denial.
- Authority Binding & Minimization: Least privilege; policy bundles versioned.
- Abuse‑of‑Power Tripwires: Alerts on anomalous enumerations and bulk reads.
- Policy Change Simulation (T+6h): Simulate rules in shadow; require review before apply.
- Dual‑Control Deletions (T+24h): Two‑person approval; logged and signed.
- Tenant Separation Chaos (T+24h): Inject cross‑tenant tests; verify isolation.
- Offline/Edge Drill (T+24–48h): Run case sync CRDT round‑trip; attest resync logs.
- SLO/Cost Guards: p95 gates, error‑budget burn; cost ceilings with alerts.
- Dissent‑by‑Default: Preserve dissent in briefs; publish counterpoints.
- Interops Smoke: Persisted queries only; introspection off; depth/complexity limits.
- Won’t‑Build Guard: Prohibit bulk deanonymization, autonomous targeting, and disallowed uses.

## Kill‑Switch Criteria
- Tenant isolation breach; provenance or disclosure falsification; unbounded authority escalation; error‑budget burn sustained with user impact; compliance blocker; offline resync corruption.

## Day‑0 → Day‑7 Watchlist
- Telemetry sanity/poisoning; license anomalies; mole‑hunt with paranoia dampener; offline kit ops and sync integrity.

## Annex: Dissent
- Angleton: “The wilderness of mirrors extends to our own dashboards.”
- le Carré: “Bureaucracy obscures truth as surely as malice.”
- Groves: “Speed without test is a gamble; test without speed is surrender.”
- Stauffenberg: “Obedience stops where conscience begins.”

## Closing
Keep boring, verifiable, and just. Evidence first; rails hot.

