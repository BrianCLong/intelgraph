# Cypher Acceptance Probes

- File: `acceptance.cypher`
- Purpose: Spot‑check policy labels and time‑travel consistency windows.
- Run: `cat db/cypher/acceptance.cypher | cypher-shell -u neo4j -p <pass>`.
- Acceptance: Queries execute without error; counts returned as expected per dataset.
