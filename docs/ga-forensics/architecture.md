# GA-Forensics Architecture

This document describes the high-level architecture of the GA-Forensics vertical slice. Services are packaged in a monorepo with a Python FastAPI forensics service, a Node.js GraphQL gateway, and a React web client. Postgres, Redis, MinIO and Neo4j back the system via docker-compose.
