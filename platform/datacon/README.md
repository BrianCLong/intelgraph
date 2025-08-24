# Data Contract & Schema Evolution Gate

## Objective
Enforce backward-compatible schemas and event contracts across all services.

## Interfaces
- `POST /contracts/validate` → `{ compat: "pass"|"fail", reasons[] }`
- `POST /events/validate` → `{ schemaId, compat, changeset }`

## Scope
- **Inputs:** OpenAPI/GraphQL schemas, Avro/Proto event specs
- **Outputs:** Signed contract bundles, diff reports, migration stubs

## Tests
- Golden schemas
- Cross-version fuzz
- Additive-only migration tests

## Merge Discipline
Controlled by `datacon.enforce` feature flag. Default "warn" and can switch to "block" via environment setting.

## Definition of Done
- Any PR that breaks compatibility is auto-blocked.
- Contract bundle published to the registry.
