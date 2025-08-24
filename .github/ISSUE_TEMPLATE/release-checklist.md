---
name: "Release Checklist"
about: "Final acceptance checklist and go-live mini-runbook"
title: "Release: v2025.08.21"
labels: release
assignees: ""
---

## Final acceptance checklist (go/no-go)

### CI/CD
- [ ] Workflows lint & pass locally (act optional); actions pinned to SHAs where possible
- [ ] `cd-deploy` runs from dedicated script (idempotent; non-zero on failure)
- [ ] `release-gate` enforces ✅ tests ✅ gitleaks ✅ SBOM ✅ perf gate ✅ SLOs green
- [ ] `batch-merge` limited to labeled PRs; required checks enforced
- [ ] RBAC drift job disabled or fixed; no dangling refs

### Secrets
- [ ] `.env*` ignored; no gitleaks exemptions

### Codebase/Containers
- [ ] `${input:duckdb_db_path}` removed; no leftover refs
- [ ] SBOM generated + uploaded; image manifests carry SBOM annotation

### Testing
- [ ] Placeholder tenancy test wired into CI (`test.todo` or explicit TODO assert)

### Docs
- [ ] README index includes: Onboarding, Golden Path, Env Vars, Runbooks, GA Criteria, Troubleshooting, **SLOs.md**

---

## Go-live mini-runbook (fast path)
1. `git checkout -b release/2025-08-21 && git push -u origin release/2025-08-21`
2. Open PR → `release-gate.yml` runs; ensure all gates green (tests, security, SBOM, perf, SLO)
3. Tag when green: `git tag v2025.08.21 && git push origin v2025.08.21`
4. Watch CD logs: images pushed ➜ Helm upgrade executed
5. Post-deploy smoke: GraphQL `/readyz`, tri-pane E2E, feed processor consuming, error budget SLOs within bounds

**Sign-off**
- Release Owner: ___  Date: ___
- SRE: ___           Date: ___
- Security: ___      Date: ___
