#!/usr/bin/env bash
set -euo pipefail
BRANCH=${1:-main}
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
# Required checks – adjust to your chosen set
REQUIRED_CHECKS='"CI", "CodeQL", "SBOM", "Trivy", "license-check", "Lockfile Verify"'

JSON_PAYLOAD=$(cat <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [${REQUIRED_CHECKS}]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 2
  },
  "required_linear_history": true,
  "allow_force_pushes": false,
  "restrictions": null
}
EOF
)

echo "$JSON_PAYLOAD" | gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/branches/${BRANCH}/protection" \
  --input -

echo "Enabled merge queue separately in Settings → Branches."
