# GA-CyberIntel Architecture

This document outlines the high-level architecture for the GA-CyberIntel vertical slice.

## Overview

GA-CyberIntel processes cyber threat intelligence data through a series of services:

1. **Gateway** – Node/Apollo GraphQL API and Socket.IO bridge.
2. **CTI Service** – Python FastAPI application handling ingest, normalization, matching, and detection.
3. **Stream Worker** – Python worker consuming Redis Streams for correlation tasks.
4. **Web Console** – React/Vite interface for analysts with jQuery-powered event wiring.

All services share TypeScript definitions located in `packages/common-types`
and rely on a PostgreSQL database, Redis, Neo4j, and MinIO.

## Data Flow

```
Logs/STIX/Sigma/YARA -> CTI Service -> PostgreSQL/Neo4j -> Stream Worker -> Alerts -> Gateway -> Web Console
```

## Security & Observability

- **TLP Enforcement:** Access to indicators, events, and alerts is filtered by Traffic Light Protocol labels.
- **Authentication:** JWT tokens signed with RS256 ensure request authenticity.
- **Metrics:** Each service exposes Prometheus `/metrics` endpoints for monitoring.
