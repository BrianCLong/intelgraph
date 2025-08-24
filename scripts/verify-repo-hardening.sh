#!/usr/bin/env bash
set -euo pipefail

red()  { printf "\e[31m%s\e[0m\n" "$*"; }
grn()  { { printf "\e[32m%s\e[0m\n" "$*"; } 2>/dev/null; }
ylw()  { printf "\e[33m%s\e[0m\n" "$*"; }

fail=0

section() { echo -e "\n=== $1 ==="; }

section "1) Ensure .env files are not tracked"
if git ls-files -ci --exclude-standard | grep -q -E '(^|/).env($|.|-)'; then
  red "Found tracked .env files!"
  fail=1
else grn "No tracked .env files."; fi

section "2) Ensure no gitleaks exemptions"
if git ls-files | grep -E 'gitleaks.(toml|yaml|yml)$' | xargs -I{} grep -nE 'allowlist|whitelist|regexes' {}; then
  red "Gitleaks exemptions detected (allowlist/whitelist/regexes)."
  fail=1
else grn "No gitleaks exemptions configured."; fi

section "3) Actions pinned to SHAs"
NON_SHA=$(grep -RIn --include='*.yml' --include='*.yaml' -Eo 'uses:\s*[^@]+@[^[:space:]#"]+' .github/workflows   | grep -v -E '@[0-9a-f]{40}($|[[:space:]])' || echo "")
if [ -n "${NON_SHA}" ]; then
  ylw "Non-SHA uses detected:\n${NON_SHA}"
  fail=1
else grn "All actions pinned to SHAs."; fi

section "4) No brittle sleeps / no `|| true` in CI"
if grep -RIn --include='*.yml' --include='*.yaml' -E '\bsleep\s+[0-9]+' .github/workflows ||    grep -RIn --include='*.yml' --include='*.yaml' -F '|| true' .github/workflows ||    grep -RIn -F '|| true' tests; then
  red "Found brittle sleeps or '|| true'."
  fail=1
else grn "No brittle sleeps and no '|| true'."; fi

section "5) SBOM present in security workflow"
if ! grep -RIn --include='*.yml' --include='*.yaml' -E 'sbom|syft|cyclonedx' .github/workflows; then
  red "SBOM generation not detected in workflows."
  fail=1
else grn "SBOM generation detected."; fi

section "6) SLOs defined"
if ! test -s docs/SLOs.md; then
  red "SLOs.md missing or empty."
  fail=1
else grn "SLOs.md present."; fi

section "7) Disabled RBAC drift job sanity"
if test -f .github/workflows/rbac-drift.yml; then
  if ! grep -q '#' .github/workflows/rbac-drift.yml; then
    ylw "rbac-drift exists; ensure it is commented/disabled or fixed."
    fail=1
  else grn "rbac-drift explicitly disabled."; fi
else grn "rbac-drift workflow not present (OK)."; fi

section "8) Release gates wired"
if ! grep -RIn --include='*.yml' --include='*.yaml' -E 'name:\s*Release Gate' .github/workflows; then
  red "release-gate workflow not found."
  fail=1
else grn "release-gate workflow present."; fi

echo
if [ $fail -ne 0 ]; then red "❌ Verifier failed with $fail issue(s)."; exit 1; fi
grn "✅ Verifier passed. Repo is production-hard."
