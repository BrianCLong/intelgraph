# GA-Ontology Architecture

This document outlines the high level architecture for the GA-Ontology vertical slice. The system consists of:

- **Gateway**: Node.js GraphQL API that forwards requests to the ontology service.
- **Ontology Service**: Python FastAPI application responsible for ontology CRUD, export, and validation routines.
- **Web Console**: React application used to interact with ontologies in the browser.
- **PostgreSQL, Neo4j, Redis, MinIO**: persistence layers used for structured data, graph traversal, caching, and object storage respectively.

Services communicate over an internal network defined in `infra/docker-compose.yml` and share common type definitions from `packages/common-types`.
