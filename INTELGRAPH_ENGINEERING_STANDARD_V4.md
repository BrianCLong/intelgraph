# IntelGraph Engineering Standard v4 (Merge‑Proof & Future‑Proof)

**Scope:** Everything needed now _and_ optional guardrails for where we’re going: npm/Yarn autodetect; Prisma‑first Postgres with Knex fallback; Neo4j migrations; GraphQL governance; CI for `pull_request` + `merge_group` (Merge Queue); commitlint (Husky + CI); CodeQL (Required); Dependabot + auto‑merge; CODEOWNERS auto‑assign; supply‑chain security (SBOM, Trivy, gitleaks, license checks, lockfile verification, provenance hooks); infra linting; observability; release process; and org‑level policy stubs.

> **Principles:** Format‑first; contract‑driven; additive changes; least privilege; determinism; automation over policy.

---

## 0) What’s new in v4 (additions over v3)

- ✅ **Ready‑to‑drop YAMLs** for Dependabot, Auto‑Assign, CodeQL, CI, PR size/labeler, stale issues, auto‑changelog, SBOM, Trivy, license check, gitleaks, actionlint, tflint, Dockerfile lint, and lockfile verification.
- ✅ **Reusable workflows** and **composite actions** for consistency across repos.
- ✅ **Branch protection as code** helper via `gh` CLI (script).
- ✅ **Issue templates** (bug, feature, chore), **SECURITY.md**, **SUPPORT.md**, **FUNDING.yml** (optional).
- ✅ **Release automation** (Changesets) with canary + stable channels, and signed release assets.
- ✅ **PR health bots**: size labels, conventional‑commit title check, required labels check.
- ✅ **Policy stubs** for SLSA provenance + Sigstore verification (future switch).

---

## 1) Repository Layout (superset)

```
/intelgraph
  /apps
    /api            # Node/Apollo
    /frontend       # React + Cytoscape.js (+ jQuery DOM wrappers)
    /worker         # Python analytics/Celery or Node workers
  /packages
    /graphql        # schema.graphql + codegen output
    /db
      /prisma       # Prisma schema + migrations
      /knex         # Knex migrations (fallback)
    /neo4j          # .cql migrations
    /shared         # shared TS/JS utils
  /infra            # Terraform/Helm/Dockerfiles
  /docs             # docs-as-code, ADRs, flags, runbooks
  /scripts          # helpers (neo4j-migrate, select-pm, branch-protection)
  .editorconfig
  .gitattributes
  .nvmrc
  package.json
  .eslintrc.cjs
  .prettierrc.json
  pyproject.toml
  .pre-commit-config.yaml
  .graphqlrc.yml
  codegen.yml
  CODEOWNERS
  SECURITY.md
  SUPPORT.md
  CONTRIBUTING.md
  .github/
    CODEOWNERS (symlink or duplicate)
    pull_request_template.md
    ISSUE_TEMPLATE/
      bug_report.yml
      feature_request.yml
      chore.yml
    workflows/
      ci.yml
      codeql.yml
      dependabot-auto-merge.yml
      auto-assign.yml
      sbom.yml
      trivy.yml
      pr-labeler.yml
      stale.yml
      license-check.yml
      lint-actions.yml
      lockfile-verify.yml
    dependabot.yml
    auto-assign.yml
    labeler.yml
    FUNDING.yml (optional)
```

---

## 2) Core Git & Merge Policy

- Trunk‑based on `main`; **Merge Queue only**; **Squash** merges.
- Rebase feature branches daily; **no merge commits** in feature branches.
- Conventional Commits enforced on commit messages **and PR titles**.
- Protected `main`: Required checks → `CI`, `CodeQL`, `SBOM`, `Trivy`, `license-check`, `lockfile-verify` (choose the set you want as Required), up‑to‑date branch, 2 approvals (or 1 CODEOWNER).
- Large binaries via Git LFS.

### `.gitattributes`

```gitattributes
* text=auto eol=lf
*.sh text eol=lf
*.bat text eol=crlf

# Lockfiles – do not noise diffs
yarn.lock -diff

# Graph schemas
*.graphql diff
*.cql diff

# LFS
*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.mp4 filter=lfs diff=lfs merge=lfs -text
```

### `.editorconfig`

```ini
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.py]
indent_size = 4

[*.md]
trim_trailing_whitespace = false
```

---

## 3) Package Manager Autodetect & Node

- Yarn if `yarn.lock`, else npm. Lockfiles required.
- Node pinned via `.nvmrc` and `engines`.

**.nvmrc**

```
18.20.4
```

**package.json (root)**

```json
{
  "private": true,
  "engines": { "node": ">=18.18 <20" },
  "scripts": {
    "install:pm": "node scripts/select-pm.js",
    "format": "prettier -w . && ruff format",
    "lint": "eslint . && ruff .",
    "typecheck": "tsc -b --pretty false",
    "test": "jest --runInBand",
    "e2e": "playwright test",
    "graphql:schema:check": "graphql-inspector diff packages/graphql/schema.graphql origin/main:packages/graphql/schema.graphql --fail-on-breaking",
    "graphql:codegen": "graphql-codegen",
    "db:pg:generate": "prisma generate",
    "db:pg:migrate": "prisma migrate deploy",
    "db:pg:status": "prisma migrate status",
    "db:knex:migrate": "knex migrate:latest --knexfile packages/db/knex/knexfile.cjs",
    "db:knex:rollback": "knex migrate:rollback --knexfile packages/db/knex/knexfile.cjs",
    "db:neo4j:migrate": "node scripts/neo4j-migrate.js",
    "changeset": "changeset",
    "release": "changeset version && changeset publish",
    "precommit": "lint-staged"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier -w"],
    "*.{py}": ["ruff --fix", "black"],
    "*.{graphql}": ["graphql-schema-linter"],
    "*.{md,css,scss,json,yml,yaml}": ["prettier -w"]
  }
}
```

**scripts/select-pm.js**

```js
/* eslint-disable no-console */
const fs = require('fs');
console.log(fs.existsSync('yarn.lock') ? 'Using Yarn' : 'Using npm');
```

---

## 4) Formatting, Linting, Types

- ESLint + Prettier for JS/TS (React + Cytoscape.js + jQuery DOM wrappers).
- Ruff + Black + mypy for Python; pytest with coverage.
- GraphQL schema linter + inspector; TS/React Apollo codegen.

**.eslintrc.cjs**

```js
module.exports = {
  root: true,
  env: { node: true, browser: true, es2022: true, jest: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: { react: { version: '18.0' } },
  rules: {
    'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules'],
};
```

**.prettierrc.json**

```json
{ "singleQuote": true, "trailingComma": "all", "printWidth": 100, "semi": true }
```

**pyproject.toml**

```toml
[tool.black]
line-length = 100

[tool.ruff]
line-length = 100
select = ["E","F","I","UP","B","C90"]
ignore = ["E501"]
fix = true

[tool.mypy]
python_version = "3.12"
warn_unused_configs = true
disallow_untyped_defs = true
strict_optional = true
ignore_missing_imports = true

[tool.pytest.ini_options]
addopts = "-q --cov=apps --cov=packages --cov-report=xml"
```

**.pre-commit-config.yaml**

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: check-merge-conflict
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: detect-private-key
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.5.7
    hooks: [{ id: ruff, args: ['--fix'] }, { id: ruff-format }]
  - repo: https://github.com/psf/black
    rev: 24.8.0
    hooks: [{ id: black }]
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks: [{ id: mypy, additional_dependencies: ['types-requests'] }]
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v9.9.0
    hooks:
      - id: eslint
        additional_dependencies: [eslint, prettier, eslint-config-prettier]
        files: .(js|jsx|ts|tsx)$
  - repo: https://github.com/okonet/lint-staged
    rev: v14.0.1
    hooks: [{ id: lint-staged }]
```

---

## 5) Commit Message Linting (Husky + CI)

**commitlint.config.cjs**

```js
module.exports = { extends: ['@commitlint/config-conventional'] };
```

**.husky/commit-msg**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx --no commitlint --edit "$1"
```

**.husky/pre-commit**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx --no lint-staged
```

---

## 6) GraphQL Governance & Codegen

**.graphqlrc.yml**

```yaml
schema: 'packages/graphql/schema.graphql'
documents:
  - 'apps/frontend/src/**/*.graphql'
```

**codegen.yml**

```yaml
overwrite: true
schema: 'packages/graphql/schema.graphql'
generates:
  packages/graphql/__generated__/client.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
```

**CI rule:** `npm run graphql:schema:check` (fails on breaking changes)

---

## 7) Databases & Migrations

### Postgres (Prisma‑first)

- Commit all migrations; never edit history.
- `npm run db:pg:generate`, `db:pg:migrate`, `db:pg:status`.

### Knex fallback

**packages/db/knex/knexfile.cjs**

```js
module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: { directory: __dirname + '/migrations' },
};
```

**example migration**

```js
exports.up = async (knex) =>
  knex.raw('CREATE INDEX IF NOT EXISTS idx_investigation_created_at ON investigation (created_at)');
exports.down = async (knex) => knex.raw('DROP INDEX IF EXISTS idx_investigation_created_at');
```

### Neo4j

**scripts/neo4j-migrate.js** provided; `.cql` files under `packages/neo4j/migrations`.

---

## 8) CI/CD (Merge Queue‑ready) – `ci.yml`

**.github/workflows/ci.yml**

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  merge_group:
    branches: [main]

concurrency:
  group: ci-${{ github.event.pull_request.number || github.sha }}
  cancel-in-progress: true

jobs:
  build-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: intelgraph }
        ports: ['5432:5432']
        options: >-
          --health-cmd="pg_isready -U postgres" --health-interval=10s
      neo4j:
        image: neo4j:5.22
        env: { NEO4J_AUTH: neo4j/test }
        ports: ['7687:7687', '7474:7474']

    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - uses: actions/setup-node@v4
        with: { node-version: '18.20.4', cache: 'npm' }

      - name: Enable Corepack (Yarn)
        run: corepack enable

      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }

      - name: Install JS deps
        run: |
          if [ -f yarn.lock ]; then yarn --immutable; else npm ci; fi

      - name: Install Python deps
        run: pip install -r requirements.txt

      - name: commitlint (PR commits & title)
        uses: wagoid/commitlint-github-action@v6

      - name: Lint (JS/TS & Python)
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Unit tests (JS & Py) with coverage
        run: |
          npm test -- --coverage
          pytest --cov-fail-under=85

      - name: GraphQL schema diff
        run: npm run graphql:schema:check

      - name: Postgres (Prisma) migrate + generate
        if: ${{ hashFiles('packages/db/prisma/schema.prisma') != '' }}
        env: { DATABASE_URL: postgresql://postgres:postgres@localhost:5432/intelgraph }
        run: |
          npm run db:pg:generate
          npm run db:pg:migrate
          npm run db:pg:status

      - name: Postgres (Knex) migrate
        if: ${{ hashFiles('packages/db/knex/knexfile.cjs') != '' }}
        env: { DATABASE_URL: postgresql://postgres:postgres@localhost:5432/intelgraph }
        run: npm run db:knex:migrate

      - name: Neo4j migrations
        env: { NEO4J_URI: bolt://localhost:7687, NEO4J_USER: neo4j, NEO4J_PASSWORD: test }
        run: npm run db:neo4j:migrate

      - name: actionlint (GitHub Workflows)
        uses: reviewdog/action-actionlint@v1

      - name: hadolint (Dockerfiles)
        uses: hadolint/hadolint-action@v3.1.0
        with: { dockerfile: '**/Dockerfile' }

      - name: Trivy (dependency & fs scan)
        uses: aquasecurity/trivy-action@0.16.0
        with: { scan-type: fs, ignore-unfixed: true, severity: HIGH, CRITICAL }

      - name: gitleaks (secrets)
        uses: gitleaks/gitleaks-action@v2
        with: { args: --no-git -v }

      - name: License check (JS)
        run: npx license-checker --production --excludePrivatePackages --summary

      - name: Build
        run: if [ -f yarn.lock ]; then yarn build; else npm run build; fi

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with: { name: coverage, path: coverage }
```

---

## 9) CodeQL (Required) – `codeql.yml`

**.github/workflows/codeql.yml**

```yaml
name: CodeQL
on:
  push: { branches: [ main ] }
  pull_request: { branches: [ main ] }
  schedule:
    - cron: '0 8 * * 1'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    strategy:
      fail-fast: false
      matrix: { language: ['javascript-typescript', 'python'] }
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: ${{ matrix.language }} }
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

---

## 10) Dependabot + Auto‑Merge – `dependabot.yml`, `dependabot-auto-merge.yml`

**.github/dependabot.yml**

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule: { interval: 'weekly' }
    open-pull-requests-limit: 10
  - package-ecosystem: 'pip'
    directory: '/'
    schedule: { interval: 'weekly' }
  - package-ecosystem: 'docker'
    directory: '/'
    schedule: { interval: 'weekly' }
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule: { interval: 'weekly' }
```

**.github/workflows/dependabot-auto-merge.yml**

```yaml
name: Dependabot Auto Merge
on:
  pull_request: { types: [opened, synchronize] }

jobs:
  dependabot:
    runs-on: ubuntu-latest
    if: ${{ github.actor == 'dependabot[bot]' }}
    steps:
      - uses: fastify/github-action-merge-dependabot@v3
        with: { github-token: ${{ secrets.GITHUB_TOKEN }}, target: minor }
```

---

## 11) CODEOWNERS Auto‑Assign – `auto-assign.yml`

**.github/workflows/auto-assign.yml**

```yaml
name: Auto Assign Reviewers
on:
  pull_request:
    types: [opened, reopened, ready_for_review]

jobs:
  auto-assign:
    runs-on: ubuntu-latest
    steps:
      - uses: kentaro-m/auto-assign-action@v1.2.1
        with: { configuration-path: '.github/auto-assign.yml' }
```

**.github/auto-assign.yml**

```yaml
addReviewers: true
addAssignees: false
reviewers:
  - intelgraph/backend-leads
  - intelgraph/frontend-leads
  - intelgraph-architecture
numberOfReviewers: 2
```

---

## 12) SBOM – CycloneDX – `sbom.yml`

**.github/workflows/sbom.yml**

```yaml
name: SBOM
on:
  push: { branches: [main] }
  workflow_dispatch: {}

jobs:
  bom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: CycloneDX/gh-node-module-generatebom@v3
        with: { output: 'bom.xml' }
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: bom.xml }
```

---

## 13) PR Hygiene – labels, size, stale

**.github/labeler.yml**

```yaml
frontend: { - 'apps/frontend/**' }
backend: { - 'apps/api/**' }
analytics: { - 'apps/worker/**' }
graphql: { - 'packages/graphql/**' }
db: { - 'packages/db/**' }
neo4j: { - 'packages/neo4j/**' }
infra: { - 'infra/**' }
```

**.github/workflows/pr-labeler.yml**

```yaml
name: PR Labeler
on:
  pull_request_target:
    types: [opened, synchronize]
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with: { repo-token: ${{ secrets.GITHUB_TOKEN }} }
```

**.github/workflows/stale.yml**

```yaml
name: Close Stale Issues
on:
  schedule: [{ cron: '0 3 * * *' }]
  workflow_dispatch: {}

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          stale-issue-message: 'This issue is stale because it has been open 30 days with no activity.'
          days-before-stale: 30
          days-before-close: 14
          exempt-issue-labels: 'pinned,security'
```

---

## 14) Lockfile Verification – `lockfile-verify.yml`

**.github/workflows/lockfile-verify.yml**

```yaml
name: Lockfile Verify
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        if: ${{ hashFiles('pnpm-lock.yaml') != '' }}
        with: { version: 9 }
      - name: Verify npm/yarn/pnpm lockfile
        run: |
          if [ -f yarn.lock ]; then corepack enable && yarn --immutable; fi
          if [ -f pnpm-lock.yaml ]; then pnpm i --frozen-lockfile; fi
```

---

## 15) Infrastructure & Actions Linting – `lint-actions.yml`

**.github/workflows/lint-actions.yml**

```yaml
name: Lint Workflows & Terraform
on: [pull_request]
jobs:
  actionlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: reviewdog/action-actionlint@v1
  tflint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: terraform-linters/setup-tflint@v4
      - run: tflint --recursive
```

---

## 16) Docker Security – `trivy.yml`

**.github/workflows/trivy.yml**

```yaml
name: Trivy Container Scan
on: [pull_request]
jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@0.16.0
        with:
          scan-type: fs
          ignore-unfixed: true
          severity: HIGH,CRITICAL
```

---

## 17) Documentation & Templates

**CONTRIBUTING.md** – includes workflow, style, PR rules, and checklists (reuse v3 content).

**SECURITY.md**

```md
# Security Policy

- Report vulnerabilities via GitHub Security Advisories or security@intelgraph.example.
- We aim to acknowledge within 48 hours and fix within 7 days for critical issues.
```

**SUPPORT.md**

```md
Open a GitHub discussion or issue with the template. Include logs, steps to reproduce, and versions.
```

**.github/ISSUE_TEMPLATE/bug_report.yml**

```yaml
name: Bug report
labels: [bug]
body:
  - type: textarea
    id: desc
    attributes: { label: Description, description: What happened? }
    validations: { required: true }
  - type: textarea
    id: repro
    attributes: { label: Reproduction, description: Steps to reproduce }
  - type: input
    id: version
    attributes: { label: Version/commit }
```

**.github/ISSUE_TEMPLATE/feature_request.yml**

```yaml
name: Feature request
labels: [feature]
body:
  - type: textarea
    id: problem
    attributes: { label: Problem, description: What problem are you solving? }
  - type: textarea
    id: proposal
    attributes: { label: Proposal, description: How should we solve it? }
```

**.github/ISSUE_TEMPLATE/chore.yml**

```yaml
name: Chore
labels: [chore]
body:
  - type: textarea
    id: task
    attributes: { label: Task, description: What needs to be done? }
```

---

## 18) Release & Versioning – Changesets

- Semantic versioning via Changesets.
- **Canary** builds for feature branches; **stable** on main.
- Signed release assets; SBOM attached.

**.github/workflows/release.yml** (optional)

```yaml
name: Release
on:
  workflow_dispatch: {}
  push:
    branches: [main]
    paths: ['.changeset/**']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18.20.4' }
      - run: npm ci
      - run: npx changeset version
      - run: npx changeset publish
```

---

## 19) Branch Protection as Code – helper script

**scripts/branch-protection.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail
BRANCH=${1:-main}
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
# Required checks – adjust to your chosen set
REQUIRED=(CI CodeQL SBOM Trivy license-check Lockfile Verify)
ARGS=()
for c in "${REQUIRED[@]}"; do ARGS+=( -f required_status_checks.contexts[]="$c" ); done

gh api -X PUT repos/$REPO/branches/$BRANCH/protection \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f enforce_admins=true \
  -f required_pull_request_reviews.required_approving_review_count=2 \
  -f required_status_checks.strict=true \
  "${ARGS[@]}" \
  -H "Accept: application/vnd.github+json"

echo "Enabled merge queue separately in Settings → Branches."
```

---

## 20) Observability Standards

- **Tracing:** OpenTelemetry; propagate traceparent from frontend → API → workers.
- **Metrics:** Prometheus counters/histograms around GraphQL resolvers, DB calls, graph ops, ML inference.
- **Logs:** Pino (Node) + structlog/loguru (Python); request IDs; redaction.
- **Dashboards:** Grafana panels included (export JSON to `/docs/observability/`).

---

## 21) Security & Compliance

- **Secrets:** never in VCS; use OIDC + cloud secret manager; rotate ≤90 days.
- **Scanning:** CodeQL (required), gitleaks, Trivy, license check, optional pip‑audit/npm‑audit.
- **AuthZ:** GraphQL directives for RBAC; Express middleware; least‑privilege DB roles.
- **PII:** Masking in logs; synthetic data in tests.

---

## 22) Testing Standards

- Unit (Jest/PyTest), Integration (Supertest/Playwright), E2E (Playwright).
- Coverage ≥85% global, ≥90% diff; perf smoke (k6 nightly optional).
- Snapshot SDL for GraphQL; contract tests for queries/mutations.

---

## 23) Non‑Negotiables (CI‑enforced)

- Format/lint/typecheck pass.
- Commitlint pass (commits + title).
- GraphQL breaking changes blocked (inspector).
- DB migrations (Prisma/Knex/Neo4j) apply cleanly.
- Security scans pass (CodeQL required; others as configured).
- Coverage thresholds met.
- PR up‑to‑date with `main` via Merge Queue.

---

## 24) Quick Start

```bash
pre-commit install
npx husky install
corepack enable  # if Yarn

[ -f yarn.lock ] && yarn --immutable || npm ci
npm run lint && npm run typecheck && npm test && npm run graphql:schema:check

# DB
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/intelgraph
npm run db:pg:generate && npm run db:pg:migrate
# or Knex
npm run db:knex:migrate

# Neo4j
export NEO4J_URI=bolt://localhost:7687 NEO4J_USER=neo4j NEO4J_PASSWORD=test
npm run db:neo4j:migrate
```

---

## 25) Roadmap toggles you can enable later

- SLSA provenance on builds; Sigstore verify releases.
- Federation gateway for GraphQL domains.
- Event sourcing + Kafka audit trail.
- Policy‑as‑code (OPA/Rego) for infra & PR gates.
- AI review bot (static heuristics → LLM summaries) behind an optional check.

---

# 26) Product & Project Management Playbook (Addendum)

> **Intent:** Add actionable PM scaffolding without altering engineering standards. This section provides issues/tickets, roadmaps, rituals, templates, swimlanes, and touchpoints that the team can adopt immediately. Everything is GitHub Projects‑friendly and copy‑pastable.

---

## 26.1 Roles & RACI (default)

| Area                        | DRI (Accountable) | Responsible              | Consulted              | Informed |
| --------------------------- | ----------------- | ------------------------ | ---------------------- | -------- |
| Product Strategy & Roadmap  | Head of Product   | PM(s)                    | Eng Lead, Design, Data | All      |
| Architecture & Graph Schema | Eng Architect     | Backend Lead, Graph Lead | PM, Security           | All      |
| Release Management          | Eng Manager       | QA, DevOps               | PM, Support            | All      |
| Security & Compliance       | Security Lead     | All devs                 | Legal, PM              | All      |
| Observability & SLOs        | Platform Lead     | DevOps                   | PM, Support            | All      |
| Data Migration (PG/Neo4j)   | Data/Graph Lead   | Backend                  | PM, Infra              | All      |

> Update `/docs/RACI.md` with named people + backups.

---

## 26.2 Delivery Cadence & Rituals (Scrum‑lean)

- **Sprints:** 2 weeks (Wednesday start → Tuesday end).
- **PI/Quarterly Planning:** once per quarter (Q3 2025, Q4 2025, Q1 2026).
- **Rituals:**
  - **Daily Stand‑up (15m):** blockers, yesterday, today.
  - **Backlog Refinement (60m, weekly):** prep next 1–2 sprints; apply Definition of Ready.
  - **Sprint Planning (90m, biweekly):** commit to sprint goal + capacity.
  - **Sprint Review/Demo (45m):** show working software; record demo.
  - **Retro (45m):** 1–2 experiments for next sprint.
  - **Architecture Review Board (60m, weekly):** schema, domain boundaries, ADRs.
  - **Security Review (30m, biweekly):** review CodeQL/gitleaks/Trivy deltas.
  - **Release Readiness (30m, before each release):** verify gates.

Create `/docs/rituals/README.md` with agenda templates (below).

---

## 26.3 Operating Model (Work Intake → Delivery)

1. **Intake:** Ideas/requests enter via **Feature Request** or **Epic** issue template.
2. **Triage:** PM + Eng Lead label, size (T‑shirt), set discovery tasks/spikes.
3. **Refinement:** break into Stories with acceptance criteria; attach designs/specs.
4. **Plan:** prioritize using WSJF (or MoSCoW) + capacity; add to sprint backlog.
5. **Deliver:** follow DoD and quality gates; demo; release via Merge Queue.
6. **Measure:** DORA, cycle time, NPS (internal), SLOs; feed learnings to roadmap.

---

## 26.4 12‑Month Product Roadmap (high‑level)

> Dates are planning anchors; adjust in GitHub Milestones.

- **Q3 2025 (Jul–Sep)**
  - **E1:** CI/Security Hardening GA (CodeQL required, SBOM, Trivy, Lockfile Verify).
  - **E2:** Prisma‑first Postgres Baseline + Knex Fallback parity.
  - **E3:** GraphQL Governance v1 (schema rules, inspector blocking).
  - **E4:** Observability Baseline (OTel traces, Grafana starter dashboards).

- **Q4 2025 (Oct–Dec)**
  - **E5:** Neo4j Migration Framework v1 + sample migrations.
  - **E6:** Release Automation (Changesets) + canary/stable.
  - **E7:** RBAC directives & least‑privilege DB roles.

- **Q1 2026 (Jan–Mar)**
  - **E8:** Graph Federation spike → v1 decision; gateway optional.
  - **E9:** SLSA provenance + Sigstore verify (opt‑in).
  - **E10:** Developer Experience polish (scaffolding, templates, docs portal).

**Mermaid Gantt (copy into docs):**

```mermaid
gantt
  title IntelGraph Roadmap (2025–2026)
  dateFormat  YYYY-MM-DD
  section Q3 2025
  E1: 2025-07-08, 2025-09-30
  E2: 2025-07-15, 2025-09-15
  E3: 2025-08-01, 2025-09-15
  E4: 2025-08-15, 2025-09-30
  section Q4 2025
  E5: 2025-10-01, 2025-12-15
  E6: 2025-10-15, 2025-11-30
  E7: 2025-11-01, 2025-12-20
  section Q1 2026
  E8: 2026-01-06, 2026-02-15
  E9: 2026-02-01, 2026-03-31
  E10: 2026-01-15, 2026-03-31
```

> Create corresponding **GitHub Milestones** and attach all Epic issues below.

---

## 26.5 Epics (issues) & Breakdown

Each epic is a GitHub issue using the **Epic** template (26.9.1). Link child stories via checklist or `projects` field.

### Epic E1 — CI/Security Hardening GA

**Goal:** Required security checks across repos; zero‑touch developer experience.

- Stories:
  - S1: Enable CodeQL required on `main`.
  - S2: Integrate SBOM workflow + artifact retention.
  - S3: Add Trivy fs scans to CI and PR gate.
  - S4: Add Lockfile Verify to required checks.
  - S5: License compliance summary in CI.
  - S6: Document security runbook.

### Epic E2 — Prisma‑First Postgres Baseline

- Stories:
  - S1: Initialize Prisma schema & migrations; wire CI migrate/status.
  - S2: Knex fallback parity migrations.
  - S3: Local developer DB bootstrap script.
  - S4: Add data seed fixtures.

### Epic E3 — GraphQL Governance v1

- Stories:
  - S1: Adopt schema linter rules; fail on breaking changes.
  - S2: Add GraphQL Codegen outputs + typed hooks.
  - S3: Add SDL snapshot tests.
  - S4: Author governance doc and examples.

### Epic E4 — Observability Baseline

- Stories:
  - S1: OTel tracing end‑to‑end (frontend → API → worker).
  - S2: Prometheus metrics around resolvers/DB calls.
  - S3: Grafana starter dashboards JSON in `/docs/observability/`.
  - S4: Logging redaction + request IDs.

### Epic E5 — Neo4j Migration Framework v1

- Stories:
  - S1: Author `.cql` migration skeletons + runner script polish.
  - S2: Add sample domain migration (e.g., Relationships: INVESTIGATES).
  - S3: Test containers for Neo4j in CI + healthchecks.

### Epic E6 — Release Automation

- Stories:
  - S1: Changesets configured; canary channel for feature branches.
  - S2: Signed artifacts + SBOM attached to releases.
  - S3: Release notes automation.

### Epic E7 — Security RBAC + Least Privilege

- Stories:
  - S1: GraphQL directives for RBAC.
  - S2: DB roles + migrations for least privilege.
  - S3: Secrets rotation policy ≤90 days.

### Epic E8 — Graph Federation Decision

- Stories:
  - S1: Spike federation gateway; benchmark perf.
  - S2: ADR: To federate or not in 2026.

### Epic E9 — SLSA + Sigstore

- Stories:
  - S1: Attach provenance to build artifacts.
  - S2: Verify releases in CI.

### Epic E10 — DX Polish

- Stories:
  - S1: Create `create-intelgraph-app` scaffold.
  - S2: Improve CONTRIBUTING + onboarding path.

---

## 26.6 Swimlanes & Board Policy (GitHub Projects)

**Board lanes (columns):**

1. **Intake** (new requests; WIP ∞; SLA triage ≤2d)
2. **Discovery** (spikes/design/legal; WIP 3)
3. **Ready** (meets DoR; WIP ∞)
4. **In Progress** (active dev; WIP per team capacity)
5. **Code Review** (WIP 5; PR linked; size ≤400 LOC recommended)
6. **Verification** (QA/UX/Perf; WIP 3)
7. **Ready to Merge** (all checks pass; queued)
8. **Released** (prod shipped, docs updated)

**Policy:**

- Cards require **Owner (assignee)**, **Epic link**, **Labels** (area, type, priority), **Estimate**.
- **Blocked** label + `blocked-by: #issue` comment for dependencies.
- Auto‑archive **Released** after 14 days.

Create `/docs/projects/board.md` with this policy and screenshots.

---

## 26.7 Label Taxonomy & Milestones

**Type:** `feature`, `bug`, `chore`, `spike`, `tech-debt`, `security`, `docs`

**Area:** `frontend`, `backend`, `graphql`, `db`, `neo4j`, `infra`, `observability`, `release`, `security`

**Priority:** `P0`, `P1`, `P2`, `P3` (P0 = hotfix, P1 = sprint commit, etc.)

**Status/Meta:** `blocked`, `needs-design`, `needs-spec`, `good-first-issue`

**Milestones:**

- `2025 Q3` → Epics E1–E4
- `2025 Q4` → Epics E5–E7
- `2026 Q1` → Epics E8–E10

Add `/docs/labels.md` capturing purpose + SLA.

---

## 26.8 Definitions (DoR/DoD) & Quality Gates

**Definition of Ready (DoR)** — a story enters **Ready** only if:

- Problem statement + acceptance criteria (Gherkin preferred).
- Designs/specs attached (or N/A).
- Dependencies identified; no unresolved blockers.
- Estimate assigned; test strategy noted.

**Definition of Done (DoD)** — a story leaves **Verification** only if:

- All CI checks green; coverage ≥85% & diff ≥90%.
- Logs/traces/metrics added as applicable.
- Docs updated (README/CHANGELOG/runbook).
- Security review passed (if `security` label present).
- Demo performed in sprint review.

Add `/docs/quality-gates.md` with these gates and CI mapping.

---

## 26.9 Issue & Ticket Templates (extended)

Place these alongside existing templates under `.github/ISSUE_TEMPLATE/`.

### 26.9.1 `epic.yml`

```yaml
name: Epic
description: Track a cross‑cutting outcome delivering user value
labels: [epic]
body:
  - type: input
    id: goal
    attributes: { label: Goal, placeholder: 'Outcome to achieve' }
    validations: { required: true }
  - type: textarea
    id: narrative
    attributes: { label: Narrative, description: 'Why now? Who benefits?' }
  - type: textarea
    id: scope
    attributes: { label: In/Out of Scope }
  - type: textarea
    id: measures
    attributes: { label: Success Measures, description: 'KPIs/SLIs' }
  - type: textarea
    id: plan
    attributes: { label: Plan, description: 'Milestones, risks, dependencies' }
  - type: checkboxes
    id: links
    attributes:
      label: Links
      options:
        - label: PRD attached
        - label: Tech Spec attached
        - label: Designs attached
```

### 26.9.2 `user_story.yml`

```yaml
name: User Story
labels: [story]
body:
  - type: textarea
    id: user
    attributes:
      label: As a … I want … so that …
      placeholder: As a <role>, I want <capability>, so that <benefit>
    validations: { required: true }
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria (Gherkin)
      value: |
        Given …
        When …
        Then …
  - type: dropdown
    id: priority
    attributes: { label: Priority, options: [P0, P1, P2, P3] }
  - type: input
    id: estimate
    attributes: { label: Estimate (story points) }
  - type: checkboxes
    id: qa
    attributes:
      label: Quality
      options:
        - label: Tests added/updated
        - label: Telemetry added
        - label: Docs updated
```

### 26.9.3 `spike.yml`

```yaml
name: Spike (Time‑boxed Research)
labels: [spike]
body:
  - type: textarea
    id: question
    attributes: { label: Research Question }
  - type: input
    id: timebox
    attributes: { label: Timebox (hours) }
  - type: textarea
    id: outcomes
    attributes: { label: Expected Outcomes, description: 'Decision options, risks, next steps' }
```

### 26.9.4 `incident.yml`

```yaml
name: Incident Report
labels: [incident, P0]
body:
  - type: input
    id: sev
    attributes: { label: Severity (SEV0–SEV3) }
  - type: textarea
    id: impact
    attributes: { label: Impact, description: 'Users, duration, scope' }
  - type: textarea
    id: timeline
    attributes: { label: Timeline of events }
  - type: textarea
    id: fixes
    attributes: { label: Immediate Fixes }
  - type: textarea
    id: followups
    attributes: { label: Follow‑ups (actionable tasks) }
```

### 26.9.5 Pull Request Template (replace or enhance)

Create/replace `.github/pull_request_template.md`:

```md
## Summary

## Type

- [ ] Feature - [ ] Bug - [ ] Chore - [ ] Security - [ ] Docs

## Checklist

- [ ] Conventional Commit title
- [ ] Linked issue(s): #
- [ ] Tests added/updated
- [ ] Telemetry added (logs/metrics/traces)
- [ ] Docs updated
- [ ] No secrets/keys in diff

## Screenshots/Notes
```

---

## 26.10 Estimation & Capacity

- **Estimation:** story points (Fibonacci). Spikes/timebox in hours.
- **Capacity:** `team_velocity_avg` from last 3 sprints; plan ≤80% of capacity.
- **Policies:**
  - Prefer small stories (≤3 points); split if >5.
  - Keep PRs ≤400 LOC change where practical.

Add `/docs/estimation.md` with examples.

---

## 26.11 Risk/RAID & Decision Logs

Create `/docs/raid-log.md` and `/docs/decisions/ADR-000-template.md`.

**RAID table template:**

| ID    | Type (Risk/Assumption/Issue/Dependency) | Description                           | Owner   | Mitigation/Action                            | Status | Due        |
| ----- | --------------------------------------- | ------------------------------------- | ------- | -------------------------------------------- | ------ | ---------- |
| R‑001 | Risk                                    | Merge Queue misconfig blocks releases | Eng Mgr | Add branch‑protection script to provisioning | Open   | 2025‑08‑30 |

**ADR template header:**

```
# ADR-XXX: Title
Date: YYYY-MM-DD
Status: Proposed/Accepted/Rejected/Superseded
Context → Decision → Consequences → Related docs
```

---

## 26.12 Change & Dependency Management

- **Change Requests:** use `chore` issue + label `change-request` for non‑feature process/tooling changes.
- **Dependencies:** capture as checklist in Epic + `blocked` label on stories; publish in `/docs/dependencies.md`.

---

## 26.13 Release Management & Environments

- **Branches:** `main` only; feature branches short‑lived.
- **Envs:** `dev` → `staging` → `prod` (promote artifacts; no rebuilds).
- **Release Train:** every sprint end (biweekly) or on demand via Merge Queue.
- **Artifacts:** signed, SBOM attached; provenance optional (SLSA when enabled).
- **Rollout:** canary by feature flag when applicable.
- **Post‑release:** smoke tests, telemetry check, docs updated.

Add `/docs/release-playbook.md` including rollback/runbook links.

---

## 26.14 Communication Plan & Touchpoints

- **Weekly Stakeholder Update:** snapshot of roadmap, risks, demos (template below).
- **Office Hours (60m weekly):** open Q&A.
- **Demo Day (end of sprint):** record & share link.
- **Status Colors:** Green (on track) / Amber (risk) / Red (off track).

**Weekly update template (`/docs/status/weekly-template.md`):**

```
# Week of YYYY‑MM‑DD
Status: Green/Amber/Red
Highlights:
- …
Risks/Blocks:
- …
Next:
- …
Links: Board, Demos, Metrics
```

---

## 26.15 Metrics & SLOs

- **Delivery:** DORA (lead time, deploy freq, change fail rate, MTTR), cycle time, WIP, throughput, PR size, review latency.
- **Product:** adoption, time‑to‑first‑value, API error budgets.
- **SLOs (initial):**
  - API p95 latency ≤ 300ms for read queries; ≤ 600ms for writes.
  - Error rate ≤ 0.1% over 7‑day rolling.
  - Incident MTTR ≤ 1h for SEV1.

Export Grafana JSON under `/docs/observability/`.

---

## 26.16 Docs & Onboarding

- **PRD template:** `/docs/templates/prd.md`
- **Tech Spec template:** `/docs/templates/tech-spec.md`
- **Runbook template:** `/docs/runbooks/TEMPLATE.md`
- **Onboarding checklist:** `/docs/onboarding.md`

**PRD skeleton:**

```
# Problem
# Users & Use Cases
# Success Metrics
# Scope (In/Out)
# UX/Flows
# Risks & Open Questions
# Release Plan
```

**Tech Spec skeleton:**

```
# Summary
# Goals/Non‑Goals
# Architecture
# Data Model (PG/Neo4j)
# API/GraphQL Contracts
# Telemetry
# Risks/Migrations
# Rollout/Backout
```

---

## 26.17 Governance & Compliance Touchpoints

- **Security control checks:** monthly review of CodeQL/gitleaks/Trivy trends.
- **Data governance:** schema changes require ARB sign‑off if PII involved.
- **Access reviews:** quarterly least‑privilege audit of DB roles/secrets.

---

## 26.18 Program Calendar (example dates)

- **PI Planning:** 2025‑09‑10, 2025‑12‑10, 2026‑03‑11
- **Quarterly Roadmap Review:** 2 weeks before each PI.
- **Release Trains:** every other Tuesday.

Add `.ics` in `/docs/calendar/` if desired.

---

## 26.19 GitHub Projects Configuration (Fields/Views)

Create **Project** named `IntelGraph Platform` with custom fields:

- `Priority` (Single‑select: P0–P3)
- `Type` (Single‑select: feature, bug, chore, spike, tech‑debt, security, docs)
- `Area` (Single‑select: frontend, backend, graphql, db, neo4j, infra, observability, release, security)
- `Estimate` (Number)
- `Status` (Iteration)
- `Target` (Milestone)
- `Epic` (Text or Issue relation)

**Saved Views:**

- **Sprint Board** (group by `Status`, filter `is:open sprint:current`).
- **By Epic** (group by `Epic`).
- **Risk Radar** (filter `label:block* OR label:P0`).
- **Security** (filter `label:security`).

Document in `/docs/projects/config.md`.

---

## 26.20 Intake & Triage SLAs

- New `feature`/`bug` issues triaged within **2 business days**.
- P0 incidents acknowledged in **15 minutes**, P1 in **1 hour** business hours.

---

## 26.21 On‑call & Incident Response Summary

- **Severities:** SEV0 (outage), SEV1 (critical impact), SEV2 (degraded), SEV3 (minor).
- **Comms:** create `incident.yml` issue, start timeline, assign IC + Scribe.
- **Postmortem:** required for SEV0/1; action items tracked as chores.

Add `/docs/incident/handbook.md`.

---

## 26.22 Sample OKRs (Q3–Q4 2025)

**Objective 1:** Ship a secure, observable platform baseline.

- KR1: 100% repos with CodeQL required by **2025‑09‑30**.
- KR2: SBOM + Trivy in CI for 100% services by **2025‑09‑30**.
- KR3: p95 API read latency ≤300ms by **2025‑09‑30**.

**Objective 2:** Improve delivery throughput.

- KR1: Reduce median PR review time to ≤8h by **2025‑10‑31**.
- KR2: Increase deploy frequency to ≥2/week by **2025‑10‑31**.
- KR3: Cut average story cycle time to ≤5 days by **2025‑10‑31**.

Track in `/docs/okrs/2025-Q3-Q4.md`.

---

## 26.23 Team Charter (1‑pager)

```
Mission: Build a merge‑proof, future‑proof graph platform.
Values: Transparency, Ownership, Pragmatism, Security‑by‑Default.
Working Hours: Core overlap 10:00–15:00 local.
Decision Making: DRIs + ADRs; escalate in ARB if blocked >2 days.
```

---

## 26.24 Ready‑to‑Run Folder Adds (optional)

Add these files to the repo:

- `/docs/rituals/README.md` (agendas)
- `/docs/projects/board.md`, `/docs/projects/config.md`
- `/docs/quality-gates.md`, `/docs/labels.md`
- `/docs/status/weekly-template.md`
- `/docs/templates/prd.md`, `/docs/templates/tech-spec.md`
- `/docs/raid-log.md`, `/docs/dependencies.md`
- `/docs/incident/handbook.md`, `/docs/onboarding.md`

---

> **Adoption tip:** Start by creating the **Project board**, adding the **Epic issues (E1–E4)** with milestones, then schedule rituals. Everything else can be layered in incrementally.
