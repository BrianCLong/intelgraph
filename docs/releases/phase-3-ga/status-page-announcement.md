# Status-Page Announcement — IntelGraph v3.0.0‑GA

**Title:** IntelGraph v3.0.0‑GA — Production Go‑Live (Blue‑Green)

**Summary:** We are deploying IntelGraph v3.0.0‑GA using a blue‑green cutover. No downtime is expected.

**When:** T‑0 window begins August 23, 2025 (local: America/Denver).
**Impact:** Connections will transparently switch to the new environment. Brief increases in latency (seconds) may occur for a subset of requests.
**What’s changing:** Performance, reliability, and security improvements; see Release Notes for details.
**Rollback:** Prior version (v2.x) remains hot for 48 hours; one‑click route revert; Kafka replay (24h); DB PITR.

**Monitoring:** We are actively tracking SLOs (API latency, graph latency, broker lag, error rate).
**Need help?** incidents@intelgraph.example · #intelgraph‑go‑live (30‑minute updates during the window)

**Thank you** for your partnership as we improve IntelGraph.
