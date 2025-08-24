# GA-Connectors Architecture

This document outlines the high level architecture for the GA-Connectors vertical slice. It covers services (Gateway, Connectors, Worker), data stores (Postgres, Neo4j, Redis, MinIO), and supporting components such as the scheduler and provenance ledger. Each service is containerized and orchestrated with `docker-compose` for local development.

