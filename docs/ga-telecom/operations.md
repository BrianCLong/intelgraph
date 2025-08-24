# Operations

Run the telecom service locally:

```bash
uvicorn telecom.main:app --reload
```

The service exposes Prometheus metrics at `/metrics` (stub) and a health
probe at `/health`.
