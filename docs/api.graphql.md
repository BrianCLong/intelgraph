# API Overview

## Queries
- `node(id: ID!)`
- `edge(id: ID!)`
- `subgraph(seedIds: [ID!], depth: Int)
- `paths(sourceId: ID!, targetId: ID!)`
- `search(text: String!, types: [String!], limit: Int, caseId: ID)`

## Mutations
- `upsertEntity(input: EntityInput!)`
- `upsertEdge(input: EdgeInput!)`
- `nlToCypherPreview(prompt: String!, caseId: ID): CypherPreview`

## Subscriptions
- `graphChanges(caseId: ID!)`
