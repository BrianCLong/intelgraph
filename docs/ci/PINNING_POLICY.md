# GitHub Actions Pinning Policy

- All actions **must** be pinned to a commit SHA (no floating tags).
- After adding/updating any action, run: `bash scripts/pin-gh-actions.sh`
- PRs with unpinned actions will be rejected by code review.
