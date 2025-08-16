# IntelGraph — Velocity Plan v6: Security, Compliance & Ops Excellence

**Owner:** Guy — Theme: production hardening & recovery confidence

**Priorities**

1. Per-tenant/user rate limits + circuit breaker
2. DLP: PII tagging & export redaction
3. Retention policies & archival hooks
4. Backup + DR drill with runbooks

**PR scaffolds**

* `security/rate-limit` — feat(security): per-tenant/user limits + breaker
* `security/dlp` — feat(security): PII tagging + redaction
* `ops/retention` — feat(ops): retention policies & archival
* `ops/backup-drill` — chore(ops): DR drill & runbooks

**Acceptance criteria**

* Abuse tests return 429; breaker opens/closes correctly
* Exports respect redaction by role/sensitivity; PII not logged
* TTLs enforced; audit trail for deletions/archival
* DR restore: RPO ≤ 15m, RTO ≤ 30m; report committed

**Observability**

* Metrics: `rate_limit_exceeded_total`, `breaker_state`, backup timings
* Alerts: breaker open >5m (page), snapshot failure (page)

**Next steps**

* Cut branches, draft PRs, schedule DR drill & publish runbooks