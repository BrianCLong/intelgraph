# IntelGraph v3.0.0‑GA — Generated Overview

**Version:** v3.0.0‑ga
**Date:** 2025‑08‑23
**Status:** GA — Blue‑green cutover, no downtime expected

## Summary
- Performance: 1.2M events/sec (sub‑8 ms), API p95 127 ms, Graph p95 1.2 s.
- Security: ABAC/OPA default ON, authority binding, signed immutable audit.
- Resilience/DR: Broker kill recovery 1m47s; cross‑region DR RTO 45m / RPO 3m.
- Cost: 31% under budget; caps + slow‑query killer + exec dashboard.

## SLO Snapshot
| Metric | Target | Achieved |
|---|---:|---:|
| API p95 latency | ≤150 ms | 127 ms |
| Graph query p95 | ≤1.5 s | 1.2 s |
| Stream throughput | ≥1.0M ev/s | 1.2M ev/s |
| DR RTO | ≤60 m | 45 m |
| DR RPO | ≤5 m | 3 m |

## Upgrade Notes
- Production requires persisted GraphQL queries (adhoc denied).
- Migrate ingestion from `/v2` to `/v3` by end of Q4 2025.
- Review tenant budgets, role‑based cost limits, and authority‑binding scopes.

## Links
- Release Notes: `../releases/phase-3-ga/release-notes-v3.0.0-ga.md`
- Status Page Announcement: `../releases/phase-3-ga/status-page-announcement.md`
- GO‑LIVE NOW Runbook: `../runbooks/go-live-now-v3.0.0-ga.md`
- Evidence Pack Index: `../releases/phase-3-ga/README.md`
