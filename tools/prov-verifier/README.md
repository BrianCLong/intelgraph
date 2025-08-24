# IntelGraph Provenance Verifier (CLI)

- Module: `tools.prov-verifier.igprov`
- Purpose: Verify disclosure/export bundle integrity via per‑file SHA‑256 and optional Merkle root.
- Run: `python -m tools.prov-verifier.igprov ./samples/disclosure-bundle`
- Acceptance: Prints `[OK] bundle verified` and exits 0 for a valid sample bundle.
