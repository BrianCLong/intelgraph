#!/usr/bin/env bash
set -euo pipefail
REPO=${REPO:-BrianCLong/intelgraph}
RATE=$(gh run list -R "$REPO" --workflow "ci:smoke" -L 20 --json conclusion | jq '[.[].conclusion == "success"] | map(if . then 1 else 0 end) | add / length * 100')

echo "ci:smoke (last 20): $RATE%"
if (( $(echo "$RATE < 50" | bc -l) )); then
  echo "🔴 KPI low—exiting with error to pause merge governor."
  exit 1
fi
echo "🟢 KPI healthy."
