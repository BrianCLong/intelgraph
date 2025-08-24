# SHUTTLE — Safe Migrations & Backfill Orchestrator

## Objective

Zero-downtime schema and data migrations with resumable backfills.

## Scope

- Expand-migrate-contract pattern
- Backfill workers with idempotency
- Guarded cutovers with automatic rollback on SLO breach

## Interfaces

- `POST /migrations/plan`
- `POST /migrations/apply`
- `POST /migrations/rollback`
- `POST /backfill/start`
- `POST /backfill/pause`
- `POST /backfill/resume`
- `POST /backfill/status`

## PR Check

- "Shuttle/Expand-Only ✔︎" must pass before deploy.

## Tests

- Fixture databases
- Failure injection: node kill, duplicate events
- Checksum verification

## Definition of Done

- Backfills are resumable
- Cutover completes with zero failed writes

## Merge Discipline

- Flag `shuttle.safe`
- Contract changes must pass DATACON gating
