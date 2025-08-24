#!/usr/bin/env bash
set -euo pipefail

npx conventional-changelog-cli -p conventionalcommits -i CHANGELOG.md -s
