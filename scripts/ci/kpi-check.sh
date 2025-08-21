#!/usr/bin/env bash
# KPI quick checks for CI health monitoring
set -euo pipefail
REPO=${REPO:-BrianCLong/intelgraph}

echo "📊 CI KPI Dashboard"
echo "==================="

# Open PR count
OPEN_COUNT=$(gh pr list -R "$REPO" --state open --json number | jq 'length')
echo "📬 Open PRs: $OPEN_COUNT"

# ci:smoke success rate over last 20 runs
SMOKE_SUCCESS=$(gh run list -R "$REPO" --workflow "ci:smoke" -L 20 --json conclusion 2>/dev/null | jq '[.[].conclusion] | map(select(.=="success")) | length' || echo "0")
SMOKE_TOTAL=$(gh run list -R "$REPO" --workflow "ci:smoke" -L 20 --json conclusion 2>/dev/null | jq 'length' || echo "20")
SMOKE_PERCENT=$((SMOKE_SUCCESS * 100 / SMOKE_TOTAL))
echo "🔥 ci:smoke success rate (last 20): ${SMOKE_PERCENT}% (${SMOKE_SUCCESS}/${SMOKE_TOTAL})"

# Queue velocity (merged in last 24h) - macOS compatible
MERGED_24H=$(gh pr list -R "$REPO" --state closed --search "merged:>=$(date -v -1d +%Y-%m-%d)" --json number 2>/dev/null | jq 'length' || echo "0")
echo "⚡ Merged (24h): $MERGED_24H PRs"

# Rate limit status
RATE_REMAINING=$(gh api rate_limit -q '.resources.core.remaining' 2>/dev/null || echo "unknown")
echo "🚦 API rate limit remaining: $RATE_REMAINING"

echo ""
echo "🎯 Targets: <15 open PRs, >90% ci:smoke success, 5-10 PRs/day"