# Architecture

GA-GraphAI is organised as a set of services:

- **Gateway** – GraphQL and Socket.IO front end.
- **GraphAI Service** – FastAPI backend providing graph algorithms,
  embeddings, model training and inference.
- **Worker** – Celery worker for asynchronous jobs.
- **Web** – React console for managing graphs and overlays.

Supporting datastores: Postgres, Neo4j, Redis and MinIO.  Docker Compose
coordinates the services for local development.
