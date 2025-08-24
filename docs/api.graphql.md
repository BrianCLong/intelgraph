# GraphQL API

The Gateway exposes a GraphQL schema for documents, pages, entities and processing mutations.

```graphql
 type Document { id: ID!, title: String!, pages: Int! }
 type Entity { text: String!, type: String!, page: Int }
 type Query { documents: [Document!]! }
 type Mutation { processDocument(title: String!): Document! }
```
