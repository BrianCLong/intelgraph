# Signing and Provenance

IntelGraph releases are signed with Cosign and include SLSA v1 provenance and a CycloneDX SBOM.

## Key Custody

- Per-region keys stored in KMS with offline root.

## Verification

```bash
./scripts/release/verify_install.sh ghcr.io/intelgraph/platform:v1.0.0
```

## Admission Controller Policy

Enable `requireSignedImages: true` and use an admission controller to block unsigned images.
