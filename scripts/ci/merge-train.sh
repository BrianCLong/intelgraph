#!/usr/bin/env bash
set -euo pipefail
REPO=${REPO:-BrianCLong/intelgraph}
MODE=${MODE:-risk}   # or "explicit"
PR_LIST=${PR_LIST:-} # space-separated PRs if MODE=explicit
SLEEP=${SLEEP:-20}
MIN_CORE=${MIN_CORE:-200}

core_left() { gh api rate_limit -q '.resources.core.remaining' 2>/dev/null || echo "999"; }

pick_next() {
  if [ "$MODE" = "explicit" ]; then
    echo $PR_LIST
  else
    # Fallback to manual list if merge-order.js fails
    node scripts/ci/merge-order.js 2>/dev/null || echo "761 760 759 758 757 756 755"
  fi
}

echo "🚂 Starting merge train (mode: $MODE, sleep: ${SLEEP}s)..."

while true; do
  # Check rate limits
  REMAINING=$(core_left)
  if [ "$REMAINING" -lt "$MIN_CORE" ]; then
    echo "⏸️ Low rate limit ($REMAINING). Sleeping 60s…"
    sleep 60
    continue
  fi

  PROCESSED=0
  for PR in $(pick_next); do
    echo "→ Attempting PR #$PR"
    
    # Check if PR is mergeable and not restricted
    if gh pr view -R "$REPO" "$PR" --json mergeStateStatus,isDraft,labels \
       --jq 'select(.isDraft==false) | select(.mergeStateStatus=="CLEAN") | select([.labels[].name]|index("wip","hold","do-not-merge")|not)' >/dev/null 2>&1; then
      if gh pr merge -R "$REPO" "$PR" --squash --auto --delete-branch 2>/dev/null; then
        echo "✅ Queued PR #$PR for merge"
        PROCESSED=$((PROCESSED + 1))
      else
        echo "❌ Failed to queue PR #$PR"
      fi
    else
      echo "⏭️ Skipping PR #$PR (not clean or restricted)"
    fi
    
    sleep $SLEEP
  done
  
  if [ "$PROCESSED" -eq 0 ]; then
    echo "🏁 No PRs processed this round. Ending merge train."
    break
  fi
  
  echo "🔄 Round complete ($PROCESSED PRs processed). Next pass in ${SLEEP}s..."
  sleep $SLEEP
done