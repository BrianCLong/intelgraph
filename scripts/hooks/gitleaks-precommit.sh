#!/usr/bin/env bash
set -euo pipefail

# Gitleaks pre-commit wrapper compatible with v8+ (no --staged flag).
# Scans only the files passed in by pre-commit.

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not found. Install with: brew install gitleaks" >&2
  exit 1
fi

shopt -s nullglob

EXIT=0
for path in "$@"; do
  # Skip non-existent files (deleted/renamed) and binary files heuristically
  [ -e "$path" ] || continue
  # Skip CI workflow files to avoid false positives on keys like 'password: ${{ ... }}'
  case "$path" in 
    .github/workflows/*) continue ;;
  esac

  # Run detect in no-git mode against the single file
  if ! gitleaks detect --no-git -s "$path" -c .gitleaks.toml --redact --report-format=json --report-path /dev/null >/dev/null 2>&1; then
    echo "gitleaks: potential secret found in $path" >&2
    EXIT=1
  fi
done

exit "$EXIT"
