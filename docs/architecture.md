# GA-Field Architecture

This document provides a high-level overview of the GA-Field vertical slice. The system is composed of client and server packages linked through a common type library.

## Components
- **Field Gateway** – GraphQL API exposing enrollment and sync endpoints.
- **Sync Library** – Local-first CRDT storage and Merkle DAG utilities.
- **P2P Relay** – WebSocket signaling server used when the gateway is unreachable.
- **Web PWA** – Offline-capable React application with service worker and IndexedDB persistence.
- **Policy & Provenance Libraries** – Shared utilities for authorization checks and manifest verification.

## Data Flow
1. Device obtains an enrollment ticket from the gateway.
2. Assignment defines selective replication scopes for a case.
3. Local changes are stored in CRDT docs and queued as deltas.
4. Sync engine pushes/pulls deltas and blobs via gateway or P2P.
5. Reconciliation writes merged state back to the authoritative graph.

## Persistence
- PostgreSQL stores devices, assignments, deltas, and blobs.
- Neo4j holds the authoritative graph.
- IndexedDB stores encrypted client data.
- MinIO provides media blob storage.

## Observability
Pino logs and Prometheus metrics expose gateway health. Clients buffer structured logs for later upload.
