# DR Orchestrator

Service providing backup and restore orchestration endpoints for Neo4j snapshots and object storage artifacts.

## Endpoints

- `POST /dr/backup` – start a backup and return artifact metadata.
- `POST /dr/restore` – initiate restore job and return job id.
- `GET /dr/status/:id` – check progress and integrity of a restore job.
