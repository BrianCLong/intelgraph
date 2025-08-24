#!/usr/bin/env bash
set -euo pipefail

# Requires: gh (GitHub CLI) logged in with read access.
# Converts all ".github/workflows/*.yml" to pin actions to commit SHAs.

shopt -s globstar

workflows=(.github/workflows/*.yml)
[ ${#workflows[ @]} -eq 0 ] && { echo "No workflows found"; exit 0; }

for wf in "${workflows[ @]}"; do
  tmp="$(mktemp)"
  pinned="$wf.pinned"

  while IFS= read -r line; do
    if [[ "$line" =~ uses: ([^ @]+) @([^[:space:]]+) ]]; then
      action="${BASH_REMATCH[1]}"
      ref="${BASH_REMATCH[2]}"

      # Skip if already looks like a SHA (40 hex)
      if [[ "$ref" =~ ^[0-9a-f]{40}$ ]]; then
        echo "$line" >>"$tmp"
        continue
      fi

      repo="$action"
      # Fetch the SHA for the ref
      sha=$(gh api repos/$repo/commits/$ref --jq .sha 2>/dev/null || true)
      if [[ -z "$sha" ]]; then
        # Try to resolve tag to commit
        sha=$(gh api repos/$repo/git/ref/tags/$ref --jq .object.sha 2>/dev/null || true)
      fi

      if [[ -n "$sha" ]]; then
        echo "${line/ @$ref/@$sha}  # was @$ref" >>"$tmp"
        echo "Pinned $repo @$ref -> $sha"
      else
        echo "$line" >>"$tmp"
        echo "WARN: Could not pin $repo @$ref (left as-is)" >&2
      fi
    else
      echo "$line" >>"$tmp"
    fi
  done <"$wf"

  mv "$tmp" "$pinned"
  mv "$pinned" "$wf"
done

echo "Done. Review diffs and commit."
