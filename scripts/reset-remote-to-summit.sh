#!/usr/bin/env bash
set -euo pipefail
ORG=${1:?Usage: $0 <ORG>}
REPO=${2:-summit}
git remote set-url origin git@github.com:${ORG}/${REPO}.git
git remote -v
