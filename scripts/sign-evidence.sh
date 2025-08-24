#!/usr/bin/env bash
set -euo pipefail
cd docs/releases/phase-3-ga
find . -type f ! -name 'SHA256SUMS*' -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
gpg --batch --yes --armor --detach-sign --local-user "${SIGNING_KEY}" SHA256SUMS
echo "Manifest + signature updated."
