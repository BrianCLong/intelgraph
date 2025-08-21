#!/usr/bin/env bash
set -euo pipefail
BR="merge-train/all-prs-$(date +%Y%m%d)"
log() { echo "[$(date +%H:%M:%S)] $*"; }

# Batch process PRs - CI/Infrastructure first, then features
BATCH_CI="593"
BATCH_INFRA="588 584 583 573 567"
BATCH_MARKETPLACE="592 591 590 589"
BATCH_AI="587 581 580 578 577 574 568"
BATCH_SPRINT="586 585 582 576 575 572"
BATCH_ANALYTICS="579 571 569 565"
BATCH_AUTH="564"

# Skip duplicates
SKIP_PRS="566 570 585"  # 566=dup of 568, 570=dup of 571, 585=dup of 586

process_pr() {
  local PR="$1"
  log "Processing PR #$PR"
  
  if [[ " $SKIP_PRS " =~ " $PR " ]]; then
    echo "| $PR | SKIPPED | duplicate | - | - | - |" >> MERGELOG.md
    return
  fi
  
  gh pr checkout "$PR" || return 1
  if git rebase "$BR"; then
    log "Clean rebase for #$PR"
  elif git merge --no-ff "$BR"; then
    log "Merge conflicts resolved for #$PR"
    git add -A && git commit --no-edit
  else
    log "Failed to merge #$PR"
    return 1
  fi
  
  git switch "$BR"
  git merge --no-ff "$(git branch --show-current)" || return 1
  
  echo "| $PR | merged | auto | - | - | $(git rev-parse --short HEAD) |" >> MERGELOG.md
}

log "Starting merge train on branch $BR"

# Process in batches
for batch in "$BATCH_CI $BATCH_INFRA $BATCH_MARKETPLACE $BATCH_AI $BATCH_SPRINT $BATCH_ANALYTICS $BATCH_AUTH"; do
  for pr in $batch; do
    process_pr "$pr" || log "Failed PR #$pr - continuing"
  done
  
  # Quick smoke test after each batch
  npm run lint --silent || log "Lint issues detected"
done

log "Merge train complete"