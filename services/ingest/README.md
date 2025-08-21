# Ingest Service

FastAPI microservice for ingesting CSV/JSON/S3 data, mapping to canonical fields, detecting PII, and emitting normalized events to Redis Streams.

## Endpoints

- `POST /ingest/jobs` – Start an ingestion job.
- `GET /ingest/jobs/{id}` – Retrieve status for a job.

## Sample

```bash
curl -X POST http://localhost:8000/ingest/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "sourceType": "csv",
    "source": "services/ingest/sample_data/sample.csv",
    "schemaMap": $(cat services/ingest/sample_data/mapping.json),
    "redactionRules": $(cat services/ingest/sample_data/redaction.json)
  }'
```

## EventEnvelope

```
{
  "tenantId": "t1",
  "entityType": "person",
  "attributes": {"entityId": "1", "fullName": "Alice", "email": "[REDACTED]", "phone": "[REDACTED]"},
  "provenance": {"source": "services/ingest/sample_data/sample.csv"},
  "policy": {"redaction": {"email": "[REDACTED]", "phone": "[REDACTED]"}}
}
```

## Development

Install dependencies and run tests:

```bash
cd services/ingest
pip install -e .[dev]
pytest
```
