# Linting Guide

This repository uses several linters and formatters to keep the codebase consistent.

## JavaScript / TypeScript

- **Lint**: `npm run lint`
- **Lint (fix)**: `npm run lint:fix`
- **Format check**: `npm run format`
- **Format fix**: `npm run format:fix`

## Python

- **Lint**: `make lint-python`
- **Format**: `make format-python`

## Additional tools

- YAML: `yamllint .`
- Markdown: `markdownlint "**/*.md"`
- Shell: `shfmt -d .` and `shellcheck <file>`
- Terraform: `terraform fmt -recursive` and `terraform validate`
- Helm: `helm lint ./helm/*`

These checks run automatically in CI via `.github/workflows/lint.yml`.
