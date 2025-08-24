# ADR 0001: Conventional commits and changelog automation

## Context
- Commit messages varied and manual changelog maintenance was error-prone.

## Options
- Leave history unstructured and curate changelog by hand.
- Enforce conventional commits and generate changelog from git metadata.

## Decision
- Use a commitlint pre-commit hook to require Conventional Commits and add `scripts/generate-changelog.sh` to build `CHANGELOG.md` automatically.

## Consequences
- **Pros:** consistent history, easier releases.
- **Cons:** contributors must learn the commit style and run the script for releases.
