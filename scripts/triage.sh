#!/usr/bin/env bash
set -euo pipefail

# —— Config ——
OUT=triage/findings.csv
mkdir -p triage
printf "Category,Item,Detail,Impact,Likelihood,Effort,PriorityScore\n" > "$OUT"
score(){
  local I=$1 L=$2 E=$3; echo $(( 5*I + 3*L - E ));
}
add(){
  local C=$1 I=$2 L=$3 E=$4 D=$5
  local S=$(score $I $L $E)
  printf "%s,%s,%s,%s,%s,%s,%s\n" "$C" "$1" "$D" "$I" "$L" "$E" "$S" >> "$OUT"
}

# —— Repo basics ——
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  :
else
  echo "Not a git repo" >&2; exit 1
fi

# Large files (bloat risk)
LARGE=$(git ls-files -z | xargs -0 du -k 2>/dev/null | awk '$1>1024*5') || true
if [[ -n "$LARGE" ]]; then add "Repo" 2 3 2 "Large files >5MB present"; fi

# License
if [[ ! -f LICENSE && ! -f LICENSE.md ]]; then add "Legal" 5 3 1 "Missing LICENSE"; fi

# Git ignore sanity
if [[ ! -f .gitignore ]]; then add "Repo" 3 3 1 ".gitignore missing"; fi

# Secrets scan (gitleaks recommended)
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --no-git -v --report-path triage/gitleaks.json || true
  if jq -e '.findings | length>0' triage/gitleaks.json >/dev/null 2>&1; then
    add "Security" 5 4 2 "Potential secrets detected (see triage/gitleaks.json)"
  fi
else
  add "Security" 5 2 1 "gitleaks not installed — secrets scan skipped"
fi

# Language detectors
NODE=$(test -f package.json && echo yes || echo no)
PY=$(ls -1 requirements*.txt 2>/dev/null | head -n1 || true)
PY=${PY:-$(test -f pyproject.toml && echo pyproject.toml)}
GO=$(test -f go.mod && echo yes || echo no)
RUST=$(test -f Cargo.toml && echo yes || echo no)
JAVA=$(test -f pom.xml || test -f build.gradle || test -f build.gradle.kts && echo yes || echo no)
DOCKER=$(test -f Dockerfile && echo yes || echo no)
TERRAFORM=$(ls -1 **/*.tf 2>/dev/null | wc -l | tr -d ' ')

# NodeJS
if [[ "$NODE" == yes ]]; then
  if ! command -v npm >/dev/null 2>&1; then add "Build" 4 4 2 "Node present but npm missing"; else
    npm ci || add "Build" 4 3 2 "npm ci failed" && true
    npm audit --audit-level=high || add "Security" 4 3 2 "npm audit found issues" && true
    if jq -e '.devDependencies.eslint or .dependencies.eslint' package.json >/dev/null 2>&1; then
      npx --yes eslint . || add "Quality" 3 3 2 "eslint violations"
    else add "Quality" 2 3 1 "eslint not configured"; fi
    if jq -e '.devDependencies.typescript or .dependencies.typescript' package.json >/dev/null 2>&1; then
      npx --yes tsc --noEmit || add "Build" 3 3 2 "Type errors (tsc)"; fi
    if jq -e '.scripts.test' package.json >/dev/null 2>&1; then
      npm test || add "Quality" 3 3 3 "Tests failing"; else add "Quality" 3 2 1 "No test script"; fi
  fi
fi

# Python
if [[ -n "$PY" ]]; then
  if command -v python >/dev/null 2>&1; then
    python -m venv .venv && source .venv/bin/activate
    pip install -U pip >/dev/null
    if [[ -f requirements.txt ]]; then pip install -r requirements.txt || true; fi
    if [[ -f pyproject.toml ]]; then pip install . || true; fi
    if command -v pip-audit >/dev/null 2>&1; then pip-audit || add "Security" 4 3 2 "pip-audit issues"; else add "Security" 3 2 1 "pip-audit not installed"; fi
    if command -v ruff >/dev/null 2>&1; then ruff . || add "Quality" 3 3 2 "ruff violations"; else add "Quality" 2 2 1 "ruff not configured"; fi
    if command -v bandit >/dev/null 2>&1; then bandit -q -r . || add "Security" 3 3 2 "bandit findings"; fi
    if compgen -G "tests/test_*.py" > /dev/null; then pytest || add "Quality" 3 3 3 "pytest failing"; else add "Quality" 3 2 1 "No pytest tests"; fi
  else add "Build" 3 3 2 "Python missing"; fi
fi

# Go
if [[ "$GO" == yes ]]; then
  if command -v go >/dev/null 2>&1; then
    go vet ./... || add "Quality" 3 3 2 "go vet issues"
    go test ./... || add "Quality" 3 3 3 "go tests failing"
    if command -v staticcheck >/dev/null 2>&1; then staticcheck ./... || add "Quality" 3 2 2 "staticcheck issues"; fi
  else add "Build" 3 3 2 "Go missing"; fi
fi

# Rust
if [[ "$RUST" == yes ]]; then
  if command -v cargo >/dev/null 2>&1; then
    cargo check || add "Build" 3 3 2 "cargo check failed"
    cargo test || add "Quality" 3 3 3 "cargo tests failing"
    cargo clippy -q -- -D warnings || add "Quality" 3 3 2 "clippy warnings"
    if command -v cargo-audit >/dev/null 2>&1; then cargo-audit || add "Security" 4 3 2 "cargo-audit issues"; fi
  else add "Build" 3 3 2 "Rust missing"; fi
fi

# Java/Kotlin
if [[ "$JAVA" == yes ]]; then
  if command -v mvn >/dev/null 2>&1; then mvn -B -ntp test || add "Quality" 3 3 3 "maven tests failing"; fi
  if command -v gradle >/dev/null 2>&1; then gradle test || add "Quality" 3 3 3 "gradle tests failing"; fi
fi

# Docker
if [[ "$DOCKER" == yes ]]; then
  if command -v hadolint >/dev/null 2>&1; then hadolint Dockerfile || add "Quality" 2 2 1 "Dockerfile lint issues"; fi
fi

# Terraform
if [[ "$TERRAFORM" -gt 0 ]]; then
  if command -v terraform >/dev/null 2>&1; then terraform -chdir=$(git rev-parse --show-toplevel) validate || add "Infra" 4 3 2 "terraform validate failed"; fi
  if command -v tflint >/dev/null 2>&1; then tflint || add "Infra" 3 3 2 "tflint findings"; fi
fi

echo "Findings written to $OUT"
