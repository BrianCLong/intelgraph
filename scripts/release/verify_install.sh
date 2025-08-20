#!/bin/bash
set -euo pipefail
IMG="${1:-ghcr.io/intelgraph/platform:v1.0.0}"
cosign verify "$IMG"
cosign verify-attestation --type cyclonedx "$IMG"
echo "Provenance & SBOM verified."
