---
title: IntelGraph GA — Executive Board One-Pager
date: 2025-08-24
owner: CTO & COO
audience: Executive Board
---

1) What we’re shipping: IntelGraph GA with provenance‑first disclosure, multi‑tenant policy isolation, and offline case sync. Client/Server images signed; SBOMs attested.

2) Why it matters: Evidence‑first intelligence at scale; compliant export; tenant boundaries held; field operability offline.

3) Readiness: CI gates green (Prom SLOs, OPA export guard, k6 p95 smoke, Cypher probes, provenance verifier). Canary values prepared; rollback proven.

4) Risks & Rails: Isolation drift, provenance gaps, offline resync faults, cost spikes — bounded by four rails: provenance gate, authority minimization, separation checks, offline drills.

5) Day‑0 plan: 5% canary; run smoke; verify alerts quiet; enable policy export guard; confirm SBOM/signatures.

6) Day‑7 plan: Dual‑control deletions; chaos on tenant separation; offline round‑trip; cost & SLO reviews; publish audit.

7) Decision: GO — boring, verifiable, and just.

