# GraphQL API

The gateway exposes a GraphQL schema that wraps ontology service endpoints. Key operations include:

```graphql
mutation CreateOntology($name: String!) {
  createOntology(input: { name: $name }) { id name version }
}
```
