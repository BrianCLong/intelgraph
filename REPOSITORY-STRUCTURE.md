# IntelGraph Repository Structure

```
/
├── README.md
├── LICENSE (MIT)
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── security-scan.yml
│       └── deploy.yml
├── docs/
│   ├── architecture/
│   │   ├── c4-model.puml
│   │   ├── sequence-diagrams.puml
│   │   └── trust-boundaries.md
│   ├── api/
│   │   └── graphql-schema.md
│   └── deployment/
│       ├── kubernetes/
│       └── helm/
├── packages/
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── graphql.ts
│   │   │   ├── realtime.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   └── constants/
│       └── package.json
├── services/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── app.ts
│   │   │   ├── graphql/
│   │   │   │   ├── schema.ts
│   │   │   │   ├── resolvers/
│   │   │   │   └── types/
│   │   │   ├── db/
│   │   │   │   ├── neo4j.ts
│   │   │   │   ├── postgres.ts
│   │   │   │   └── redis.ts
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── ingest/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── connectors/
│   │   │   │   ├── sdk/
│   │   │   │   ├── http-csv/
│   │   │   │   ├── s3/
│   │   │   │   └── stix-taxii/
│   │   │   ├── enrichers/
│   │   │   └── processors/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── entity-resolution/
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── api/
│   │   │   ├── engines/
│   │   │   │   ├── deterministic.py
│   │   │   │   └── probabilistic.py
│   │   │   ├── models/
│   │   │   └── scoring/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── rag/
│       ├── src/
│       │   ├── main.py
│       │   ├── api/
│       │   ├── retrieval/
│       │   ├── generation/
│       │   └── citation/
│       ├── Dockerfile
│       └── requirements.txt
├── client/
│   ├── public/
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── graph/
│   │   │   │   ├── GraphCanvas.tsx
│   │   │   │   └── CytoscapeGraph.tsx
│   │   │   ├── timeline/
│   │   │   ├── map/
│   │   │   ├── layout/
│   │   │   └── common/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── styles/
│   ├── Dockerfile
│   └── package.json
├── infrastructure/
│   ├── terraform/
│   ├── kubernetes/
│   │   ├── base/
│   │   └── overlays/
│   └── helm/
│       └── intelgraph/
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── performance/
├── scripts/
│   ├── setup-dev.sh
│   ├── seed-data.sh
│   └── demo-walkthrough.sh
└── migrations/
    ├── postgres/
    └── neo4j/
```

## Key Components

### Services Architecture
- **API Service**: Main GraphQL API with Express/Apollo
- **Ingest Service**: Data ingestion pipeline with connector SDK
- **Entity Resolution Service**: Python-based ML service for entity matching
- **RAG Service**: Retrieval-Augmented Generation for AI Copilot

### Frontend Structure
- **Tri-pane Layout**: Timeline, Map, Graph synchronized views
- **Component Library**: Material UI with custom graph components
- **State Management**: Redux Toolkit for complex state scenarios

### Infrastructure
- **Docker Compose**: Development environment
- **Kubernetes/Helm**: Production deployment
- **Terraform**: Infrastructure as Code for cloud resources

### Security & Governance
- **OPA Policies**: Stored in `infrastructure/opa/`
- **OIDC Configuration**: Environment-based configuration
- **Audit Logging**: Centralized through all services