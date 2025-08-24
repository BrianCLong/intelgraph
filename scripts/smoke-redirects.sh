#!/usr/bin/env bash
set -euo pipefail

# Smoke test docs redirects (web-only; do not target API hosts)
# Usage: BASE_URL=https://docs.example.com NEW_OK_HOST=https://docs.example.com \
#        scripts/smoke-redirects.sh docs/legacy-top100.txt

LIST=${1:?Usage: BASE_URL=<old> NEW_OK_HOST=<new> $0 <paths_file>}
BASE=${BASE_URL:?Set BASE_URL (old host e.g., https://docs.intelgraph.com)}
NEW=${NEW_OK_HOST:-}

fail=0
while IFS= read -r p; do
  [ -z "$p" ] && continue
  url="${BASE%/}${p}"
  # First hop: expect 301/308 with Location
  read -r code loc < <(curl -sI "$url" | awk 'BEGIN{c="";l=""} /^HTTP\//{c=$2} /^Location:/{l=$2} END{print c, l}')
  if [[ "$code" != "301" && "$code" != "308" ]]; then
    echo "[FAIL] $url expected 301/308 got $code" >&2; fail=1; continue
  fi
  # Optional hostname check
  if [[ -n "$NEW" && "$loc" != ${NEW%/}/* ]]; then
    echo "[WARN] $url redirect host differs: $loc" >&2
  fi
  # Second hop should be 200 (no long chains)
  code2=$(curl -sI "$loc" | awk '/^HTTP\//{print $2; exit}')
  if [[ "$code2" != "200" ]]; then
    echo "[FAIL] $loc expected 200 got $code2" >&2; fail=1; continue
  fi
  echo "[OK] $url -> $loc -> 200"
done < "$LIST"

exit $fail
