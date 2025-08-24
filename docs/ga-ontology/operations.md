# Operations

- `docker-compose up` launches Postgres, Neo4j, Redis, MinIO, gateway, ontology service, and web app.
- Metrics exposed on `/metrics`; health at `/health`.
- Logs use structured formats: pino for Node and Python logging for FastAPI.
