# Graph API Service

GraphQL service providing CRUD operations for graph entities backed by Neo4j.

## Setup

```bash
npm install
npm run dev
```

Neo4j connection defaults to `bolt://localhost:7687` with `neo4j/test`.

## Example Query

```graphql
mutation CreatePerson {
  createPerson(
    input: {
      provenance: { source: "test", confidence: 0.9, chain: [] }
      policy: { tenantId: "t1", sensitivity: "low" }
    }
  ) {
    id
    policy { tenantId }
  }
}
```

## Running with Docker

```bash
docker-compose up --build
```

## Testing

```bash
npm test
```
