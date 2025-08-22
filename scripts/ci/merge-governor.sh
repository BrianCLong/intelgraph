#!/usr/bin/env bash
set -euo pipefail
REPO=${REPO:-BrianCLong/intelgraph}
TARGET=${TARGET:-90}      # desired smoke pass %
COOLDOWN=${COOLDOWN:-900} # pause 15m when below floor
MAX_CONC=${MAX_CONC:-1}   # serial by default
RATE=$(gh run list -R "$REPO" --workflow "ci:smoke" -L 20 --json conclusion   | jq '[.[].conclusion=="success"] | (add/length*100) | tonumber')

echo "ci:smoke (last 20): $RATE% (target $TARGET%)"
if (( ${RATE%.*} < 50 )); then echo "🔴 KPI low—pausing $COOLDOWN s"; sleep "$COOLDOWN"; exit 0; fi

# scale merge step based on KPI
if   (( ${RATE%.*} >= TARGET )); then BATCH=3
elif (( ${RATE%.*} >= 70     )); then BATCH=2
else                                BATCH=1
fi

echo "Merging up to $BATCH PR(s)…"
N=0
for PR in $(node scripts/ci/merge-order.js); do
  gh pr merge -R "$REPO" "$PR" --squash --auto --delete-branch || true
  N=$((N+1)); (( N>=BATCH )) && break
done
