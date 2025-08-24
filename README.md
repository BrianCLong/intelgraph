# IntelGraph Developer Guide

## Quickstart

```bash
cp .env.example .env
make bootstrap
make up
make smoke
```

- Client: http://localhost:3000
- API: http://localhost:4000/graphql

## Environment variables

| Name | Purpose | Default |
| --- | --- | --- |
| NEO4J_URI | Neo4j connection | bolt://localhost:7687 |
| POSTGRES_DB | Postgres database | intelgraph_dev |
| REDIS_HOST | Redis host | localhost |
| JWT_SECRET | Auth token secret | change-me |
| AI_MODELS_PATH | Path to ML models | src/ai/models |

*See `.env.example` for the full list.*

## Make targets

| Target | Description |
| --- | --- |
| bootstrap | install dependencies and copy `.env` |
| up | start core services |
| up-ai | include AI processing services |
| up-kafka | include Kafka profile |
| up-full | start all services |
| down | stop containers |
| logs | tail compose logs |
| ps | list running containers |
| ingest | produce sample posts to Kafka |
| graph | consume posts into Neo4j |
| smoke | run smoke tests |
| clean | remove `node_modules` and virtualenvs |
| reset-db | drop Neo4j data volume |
| changelog | regenerate `CHANGELOG.md` |

## Documentation index

- [Architecture](ARCHITECTURE.md)
- [API](API.md)
- [ADR 0001](adr/0001-decision-conventional-commits-changelog.md)

---

Licensed under the [MIT License](LICENSE).
