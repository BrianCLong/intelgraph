# OPA Export Guard

- File: `export.rego`
- Purpose: Deny dataset export when source licenses restrict (`DISALLOW_EXPORT`, `VIEW_ONLY`, `SEAL_ONLY`).
- How to run: `opa eval -i input.json -d policy/opa 'data.intelgraph.policy.export.allow'`.
- Acceptance: Given input with a restricted source, policy returns false and emits a human‑readable reason in `deny`.
