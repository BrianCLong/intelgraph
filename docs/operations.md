# Operations Runbook

## Development
- `docker-compose up` starts Postgres, Neo4j, MinIO, gateway, relay, and web containers.
- `npm run dev` launches gateway and PWA with hot reload.

## Production
- Kubernetes manifests are provided under `infra/helm`.
- Prometheus scrapes `/metrics` endpoints for monitoring.
- Logs are shipped using a sidecar collector.

## Maintenance
- Use `scripts/dev-seed.ts` to populate demo data.
- `npm run db:migrate` applies schema changes.
- `npm run db:seed` loads baseline tenants, devices, and cases.
