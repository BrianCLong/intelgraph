# IntelGraph GA-InfraOps

This repository provides a vertical slice of the **GA-InfraOps** stack for IntelGraph.
It demonstrates high availability, disaster recovery, observability, autoscaling,
performance testing and chaos engineering.

## Quickstart

### Docker Compose (single node)
```bash
cd infra
cp .env.example .env
docker compose up -d
```

### k3d Multi‑Region
```bash
cd infra/k3d
./create-region-a.sh
./create-region-b.sh
./linkerd-install.sh
```

### Run Operator Demo
```bash
npm --workspaces packages/ops-operator start
```

### Multi‑Region Diagram
```
          +---------------+          +---------------+
          |  region-a     |          |  region-b     |
          | (k3d cluster) |          | (k3d cluster) |
          +-------+-------+          +-------+-------+
                  |                           |
            +-----v-----+               +-----v-----+
            | Linkerd   |<---mTLS--->   | Linkerd   |
            +-----------+               +-----------+
                  |                           |
            +-----v-----+               +-----v-----+
            |  Gateway  |  <---DR-->    |  Gateway  |
            +-----------+               +-----------+
```

See [`docs/`](docs/) for detailed architecture, SLOs and runbooks.
