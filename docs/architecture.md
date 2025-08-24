# Architecture Overview

This document describes the GA-Tradecraft vertical slice architecture.

## Components
- Gateway API (Node/Apollo)
- Analyst Service (FastAPI)
- Web Workbench (React)
- PostgreSQL, Redis, Neo4j, MinIO

Services communicate over the docker-compose network. The gateway exposes GraphQL and proxies calls to the analyst service.
