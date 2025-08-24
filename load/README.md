# k6 GraphQL SLO Smoke

- Script: `k6-graphql-slo.js`
- Purpose: Validate p95 < 1.5s at 3‑hop neighborhood under light load.
- Run: `k6 run load/k6-graphql-slo.js` with env `GRAPHQL_URL` and optional `SEED_NODE`.
- Acceptance: 200 responses and duration < 1500ms checks pass over run.
