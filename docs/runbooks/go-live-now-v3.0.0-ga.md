# GO‑LIVE NOW Runbook — IntelGraph v3.0.0‑GA (War Room One‑Pager)

**Release Version:** v3.0.0‑ga
**Release Date:** August 23, 2025
**Owner:** IntelGraph Program Team
**Contact:** Stakeholder Management Team · incidents@intelgraph.example · #intelgraph-go-live

---

## 1) Pre‑Flight (All Boxes Required)

- [ ] Release v3.0.0‑ga tag verified (GPG‑signed), artifacts checksummed (SHA256SUMS ✅).
- [ ] Persisted queries published for all production tenants.
- [ ] Budgets/cost limits confirmed per tenant/role; kill‑switches armed.
- [ ] Authority binding policies loaded; audit signing keys rotated last ≤ 30 days.
- [ ] Backup checkpoint taken; PITR markers set; DR restoration test within last 7 days.
- [ ] On‑call rotations paged in; comms channels live; status‑page draft staged.

## 2) Execute Blue‑Green Cutover (T‑0)

1. Scale up GREEN to target capacity; warm caches and LOD.
2. Health‑check GREEN: /healthz, /readyz, synthetic GraphQL (read/write), stream ingest dry‑run.
3. Flip Traefik routes 10% → 50% → 100% per SLO guardrails.
4. Enable enhanced tracing for first 60 minutes.
5. Announce status‑page GO; start 30‑minute update cadence.

## 3) Live Verification (T+0 → T+90m)

- [ ] API p95 ≤ 150 ms; error rate ≤ baseline+0.5%.
- [ ] Graph p95 ≤ 1.5 s; hot path CPU ≤ 75%; GC time ≤ budget.
- [ ] Broker lag ≤ 60 s, backlog drains < 10 min after peak.
- [ ] DR hooks callable; audit signer logs clean; OPA decision logs normal.
- [ ] Cost guardrails show budget adherence; no slow‑query kills on golden paths.

## 4) Rollback (Any Red Condition)

- [ ] One‑click route revert to BLUE.
- [ ] Disable producers, drain consumers; Kafka replay scoped to affected partitions.
- [ ] PITR restore if data writes at risk; hash validation before reopen.
- [ ] Post‑rollback comms to status page + stakeholders.

## 5) T+1 Day Validation & Closeout

- [ ] All SLOs green for 24h; error budget burn within policy.
- [ ] Release notes public; status page closed as Completed.
- [ ] DR drill retrospective items ticketed; cost deltas reviewed.
- [ ] Tag v3.0.0‑ga‑post1 (if hotfixes applied) and archive war‑room logs.

---

### Quick Links

- Release Notes: `docs/releases/phase-3-ga/release-notes-v3.0.0-ga.md`
- Status‑Page Announcement: `docs/releases/phase-3-ga/status-page-announcement.md`
- Evidence Pack index: `docs/releases/phase-3-ga/`
- Risk Register: §7 in Go‑Live Packet v2
- Runbooks RB‑001…RB‑006 (Ops library)
