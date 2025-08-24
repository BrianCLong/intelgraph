# IntelGraph-MVP

Minimal multi-tenant intelligence graph platform with FastAPI backend, Next.js UI, and CSV ingest tool.

## Quickstart

```bash
cp .env.sample .env
make up
```

Open http://localhost:3000 for the UI.

Run tests:
```bash
make test
```

## JWT

Generate a development token:
```bash
curl -X POST http://localhost:8000/auth/token -d '{"sub": "user1", "roles": ["analyst"], "clearances": ["analyst"], "cases": ["c1"]}' -H 'Content-Type: application/json'
```

## Entity Resolution

Persons sharing an email or phone are merged deterministically. Use `POST /entities/merge` to merge manually.

## Policy & Clearance

Each node and relationship carries policy metadata. Requests require appropriate clearance; try omitting `analyst` clearance to receive a 403.
