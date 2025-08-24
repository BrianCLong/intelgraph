# GA-Investigator

```
query --> scene --> layout --> overlay --> collab --> storyboard --> export
```

## Quickstart

```bash
docker-compose up --build
```

## Monorepo

- `packages/gateway` – GraphQL gateway
- `packages/investigator` – FastAPI service
- `packages/web` – React console
- `packages/common-types` – shared types
- `packages/prov-ledger` – provenance signing
- `packages/policy` – ABAC helpers
- `docs/` – architecture and guides
- `infra/` – docker-compose and Helm charts
- `scripts/` – development scripts

Licensed under MIT.
