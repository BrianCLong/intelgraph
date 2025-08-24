# GraphQL API Overview

The gateway exposes types for ontologies, versions, classes, properties, proposals, mappings, validations, and releases.

Example query:

```
query GetClasses($versionId: ID!) {
  classes(versionId: $versionId) { key label }
}
```
