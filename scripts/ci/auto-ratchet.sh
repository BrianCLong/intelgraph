#!/usr/bin/env bash
set -euo pipefail
REPO=${REPO:-BrianCLong/intelgraph}
BR=${BR:-main}
THRESHOLD=${THRESHOLD:-10}

echo "🔍 Checking merge count for auto-ratchet (threshold: $THRESHOLD)..."
OK=$(gh pr list -R "$REPO" --state closed --search "sort:updated-desc base:$BR" --json number,mergedAt --jq '[.[]|select(.mergedAt!=null)]|length')

if [ "$OK" -ge "$THRESHOLD" ]; then
  echo "✅ Threshold met ($OK merges). Ratcheting protections on $BR…"
  gh api -X PUT "repos/$REPO/branches/$BR/protection" --input /tmp/enhanced_protection.json
  echo "🔒 Enhanced protections applied to $BR"
else
  echo "⏳ Only $OK merges; threshold $THRESHOLD not reached yet."
fi