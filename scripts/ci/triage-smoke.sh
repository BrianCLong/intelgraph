#!/usr/bin/env bash
set -euo pipefail
REPO=${REPO:-BrianCLong/intelgraph}
for N in $(gh pr list -R "$REPO" --state open --json number --jq '.[].number'); do
  RUN=$(gh run list -R "$REPO" --workflow "ci:smoke" --json databaseId,headSha,conclusion,headBranch -L 1         --jq '.[]|select(.conclusion=="failure")|.databaseId' || true)
  [ -z "$RUN" ] && continue
  LOG=$(gh run view -R "$REPO" "$RUN" --log)
  MSG=""
  if   grep -qi "ENOMEM|JavaScript heap out of memory" <<<"$LOG"; then MSG="Build OOM → fixed by NODE_OPTIONS=--max-old-space-size=4096"; fi
  if   grep -qi "ECONNRESET|fetch failed" <<<"$LOG"; then MSG="$MSGnNetwork fetch flake → npm retry already enabled"; fi
  if   grep -qi "playwright.*timeout" <<<"$LOG"; then MSG="$MSGnPlaywright flake → retries+trace on; consider quarantining spec"; fi
  [ -n "$MSG" ] && gh pr comment -R "$REPO" "$N" --body "ci:smoke triage:n$MSG"
done
