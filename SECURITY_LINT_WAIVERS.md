# Security Lint Waivers

Use this log to track temporary waivers for security lint rule violations. Each entry must include an owner and an expiry no more than 30 days out.

| Rule | Count (baseline) | Example files | Risk | Owner | Expiry (≤30d) | Resolution Plan |
|------|------------------|---------------|------|-------|---------------|-----------------|
| _example_ | 1 | `apps/web/src/foo.ts` | RCE via eval | @owner | 2025-01-31 | Refactor to remove eval |

> CI blocks **new** security rule violations on changed files. Waivers only apply to existing issues until resolved.
