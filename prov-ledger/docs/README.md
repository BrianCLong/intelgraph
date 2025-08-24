# Provenance & Claim Verification Ledger

Standalone microservice for claim extraction, evidence registration, and provenance tracking.

## Neo4j Schema Overview

The ledger persists four primary node types enforced by uniqueness and property existence constraints.

| Node          | Required properties                | Indexed properties           |
| ------------- | ---------------------------------- | ---------------------------- |
| **Claim**     | `id`, `hash`, `created_at`         | `hash`, `created_at`         |
| **Evidence**  | `id`, `kind`, `hash`, `created_at` | `kind`, `hash`, `created_at` |
| **License**   | `id`, `name`, `url`                | `name`, `url`                |
| **Authority** | `id`, `name`, `jurisdiction`       | `name`, `jurisdiction`       |

### Relationships

- `(:Claim)-[:SUPPORTED_BY]->(:Evidence)`
- `(:Evidence)-[:LICENSED_UNDER]->(:License)`
- `(:License)-[:ISSUED_BY]->(:Authority)`

These definitions ensure consistent provenance lookups and fast verification queries.
