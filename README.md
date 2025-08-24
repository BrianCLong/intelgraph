# GA-FinIntel

```
KYC -> Ingest -> Screen -> Detect -> Score -> Alert -> Export
```

## Quickstart

```bash
docker-compose -f infra/docker-compose.yml up --build
```

Services:
- FastAPI at http://localhost:8000
- GraphQL gateway at http://localhost:4000
- Web console at http://localhost:3000
