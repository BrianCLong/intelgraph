#!/usr/bin/env bash
set -euo pipefail

# Usage: OWNER=<org_or_user> REPO=<repo> PROJECT_URL=https://github.com/users/<user>/projects/<n> ./scripts/set_project_url.sh

: "${OWNER:?Set OWNER}" "${REPO:?Set REPO}" "${PROJECT_URL:?Set PROJECT_URL}"

gh repo view "$OWNER/$REPO" >/dev/null
gh variable set PROJECT_URL -b "$PROJECT_URL" --repo "$OWNER/$REPO"
echo "Set vars.PROJECT_URL for $OWNER/$REPO to $PROJECT_URL"

