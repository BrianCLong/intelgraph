# Unified Graph Gateway

This gateway composes IntelGraph subgraphs into a single federated endpoint with strong security controls.

## Features

- **Persisted Operations**: Only SHA-256 hashed queries found in `ops/persisted.json` are executed.
- **ABAC/OPA Enforcement**: Requests include tenant and user context and are checked against policy via `OPA_URL`; policy obligations are attached to the request context and returned on denial.
- **Query Guardrails**: Depth limited to 10 and cost limited to 3000.
- **Redacted Logging**: Pino logger removes sensitive fields.
- **Caching**: Redis cache helper provided in `src/cache.ts`.

## Threat Model

- Data exfiltration mitigated via persisted queries and complexity limits.
- Introspection disabled in production.
- Resolver logs are redacted to prevent PII leakage.

## Onboarding Persisted Ops

1. Write operation `.graphql` file.
2. Hash with `sha256` and add to `ops/persisted.json`.
3. Submit PR for two-person review.

## Rollback

- Remove offending hash from `ops/persisted.json`.
- Redeploy gateway; unknown operations are rejected.

## SLOs

| SLO                                      | Target |
| ---------------------------------------- | ------ |
| Persisted-ops coverage                   | 100%   |
| Cache hit rate                           | ≥ 70%  |
| Policy-denied requests correctly blocked | 100%   |

## Troubleshooting

- Ensure Redis is running and `REDIS_URL` is set.
- Use `NODE_ENV=development` to bypass persisted-ops check.
- Set `OPA_URL` to the policy engine endpoint (defaults to `http://localhost:8181/v1/data/graphql/guard`).
