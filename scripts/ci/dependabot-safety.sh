#!/usr/bin/env bash
set -euo pipefail

REPO=${REPO:-BrianCLong/intelgraph}

echo "🔒 Applying Dependabot safety controls for $REPO"

# Label major version bumps as high-risk during stabilization
echo "🏷️ Labeling major version bump PRs as high-risk..."

for PR_NUM in $(gh pr list -R "$REPO" --author app/dependabot --json number,title \
  -q '.[] | select(.title|test(" to [1-9][0-9]*\\.")) | .number'); do
  
  echo "⚠️ Labeling PR #$PR_NUM as risk:high (major version bump)"
  gh pr edit -R "$REPO" "$PR_NUM" --add-label "risk:high" || true
  
  # Add explanatory comment
  gh pr comment -R "$REPO" "$PR_NUM" --body "🤖 **Dependabot Safety**

This PR contains a major version bump and has been labeled \`risk:high\` during the CI stabilization period.

Major version changes are temporarily excluded from auto-merge to maintain system stability while we improve CI reliability.

This will be reviewed manually once our ci:smoke pass rate reaches >90%." || true
done

echo "✅ Dependabot safety controls applied"