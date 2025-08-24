# GA-Ontology Architecture

The GA-Ontology stack is a set of services that run locally via `docker-compose`.

```
+-----------+      +-----------------+      +-------+
|  Web UI   | <--> |  Gateway (GraphQL) | <--> | Redis |
+-----------+      +-----------------+      +-------+
        |                    |                    |
        v                    v                    v
+-----------------+  +--------------+  +----------------+
| Ontology Service|  | PostgreSQL   |  |   Neo4j        |
+-----------------+  +--------------+  +----------------+
```

The gateway exposes a GraphQL API and relays real-time events via Socket.IO. The ontology service materializes RDF, validates data, and builds the search index.
