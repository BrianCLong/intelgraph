# IntelGraph v3.0.0-ga Cutover Guide (Blue/Green)

## Preflight (T-1 → T-0)

- Evidence signature check
- Helm diff (no-op)

## Switch Steps

1. Seed persisted hashes and enforce in gateway
2. Ensure OPA bundle `prod.tar.gz` is pinned and refreshed
3. Shift Traefik weight to **green** (100/0)
4. Run smoke + ingest probes

## Commands

```bash
cd docs/releases/phase-3-ga && sha256sum --check SHA256SUMS && gpg --verify SHA256SUMS.asc SHA256SUMS
kubectl -n intelgraph set env deploy/gateway ENFORCE_PERSISTED=true
kubectl -n intelgraph patch ingressroute gateway --type='json' -p "$(cat deploy/traefik/patch-weight-green.json)"
# smoke
curl -s -XPOST "$GQL_URL/graphql" -H "x-tenant: default" -H "x-persisted-hash: sha256:abc123..." -H "content-type: application/json" -d '{"operationName":"Ping","variables":{}}' | jq .
```

## Rollback

- Patch weights to **blue** (0/100) using `patch-weight-blue.json`
- Retain v2.x hot 48h; PITR verified
