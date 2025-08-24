# Supply Chain Security

This document describes the end-to-end secure CI/CD chain.

## Pipeline

The release workflow builds container images from pinned base digests, generates an SBOM with Syft, scans for vulnerabilities using Trivy, signs the image with Cosign keyless signing, and produces a SLSA provenance attestation. The workflow outputs a machine-readable `trust-report.json` artifact.

## Admission Policy

`infra/policy/required-signatures.rego` denies deploying images that use mutable tags or lack valid Cosign signatures bound to the commit SHA.

## trustctl

`tools/trustctl/trustctl.js` verifies an image and writes `trust-verify.json` containing signature and SBOM status.

## Rollback and Identity Rotation

SLSA attestations and signature checks enable provenance tracking and quick rollback. Rotate OIDC identities by updating signing permissions and rerunning the workflow.
