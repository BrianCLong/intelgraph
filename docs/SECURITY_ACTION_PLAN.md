# Security Action Plan

This document captures remediation tasks for identified security gaps and outlines high-impact improvements.

## Gaps & Risks

### Secrets hygiene
1. Run the repository's secret scanner (`scripts/scan-secrets.sh`) and review the `potential-secrets.csv` report.
2. Remove or rotate any committed credentials and document remediation in the corresponding issue.
3. Migrate required secrets to sealed secrets, Vault, or a cloud KMS and reference them via `.env` or OIDC.
4. Add a pre-commit hook (`gitleaks` or `detect-secrets`) to prevent future plaintext secrets.

### Performance & budget enforcement
1. Define p95 latency and TTFB budgets in `tests/performance/*.js` k6 scripts.
2. Wire the k6 GitHub Action to fail the PR when thresholds are exceeded.
3. Trend the results in `test-results/k6/` and review regressions in sprint retros.

### GraphQL cost/complexity limits
1. Enable depth and complexity limits in the GraphQL server (`server/src/app.js`).
2. Require persisted queries and block ad-hoc queries in production (`ApolloServerPluginCacheControl`).
3. Add regression tests that fail when queries exceed configured limits.

### Policy testing
1. Add Rego unit tests under `rbac/policies/tests` for each rule file.
2. Capture snapshot diffs for policy changes and store under `rbac/policies/__snapshots__`.
3. Run `npm run policy:test` in CI and gate merges on passing tests.

### SBOM & provenance
1. Generate `sbom.yml` during build with `npm run sbom`.
2. Sign container images and the SBOM using `cosign` with OIDC identity.
3. Attach attestations to releases and store hashes in `prov-ledger/`.

### Database migrations
1. Author idempotent PostgreSQL and Neo4j migrations in `server/db/migrations` with clear up/down scripts.
2. Execute migrations in CI (`npm run db:migrate`) and verify with smoke tests.
3. Provide rollback scripts and data health checks (`npm run db:health`) for every release.

### Threat modeling evidence
1. Update `docs/THREAT_MODEL.md` with new attack surfaces when features ship.
2. Generate architecture diagrams in CI (`npm run threat-model:diagram`) and commit to `docs/generated/`.
3. Link threat scenarios to mitigations in issue trackers for traceability.

## High-Impact Next Steps

### Lock CI gates
1. Configure branch protection to require `ci-security`, `ci-test`, `ci-performance-k6`, `sbom`, `trivy`, and policy test workflows.
2. Enforce Jest coverage thresholds via `jest.config.cjs` and fail builds on regression.
3. Audit required checks quarterly to ensure new pipelines are enforced.

### Release checklist
1. Expand `release.yml` with a cutover smoke test step hitting health endpoints.
2. Verify GraphQL introspection is disabled in production builds.
3. Pin OPA bundles and perform migration dry-runs before tagging releases.
4. Document rollback scripts under `docs/releases/` and reference them in the workflow.

### Runtime guardrails
1. Add `express-rate-limit` and dataloaders in `server/src/app.js` to mitigate abuse.
2. Implement tenant-scoped ABAC policies with deny-by-default in `rbac/`.
3. Exercise guardrails via integration tests (`server/src/tests/enterpriseSecurity.test.js`).

### Helm values
1. Add `helm/values-prod.yaml` with sane defaults for GKE/EKS/AKS.
2. Standardize secret management via OIDC to cloud KMS and document in Helm chart README.
3. Include HPA and PodDisruptionBudget defaults for each service.

### Evidence automation
1. Implement `soc2-evidence.yml` workflow to archive test reports, SBOMs, image digests, and policy logs.
2. Publish artifacts to a versioned bucket keyed by release tag.
3. Link evidence artifacts in release notes for audit readiness.

