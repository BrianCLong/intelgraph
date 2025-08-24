# IntelGraph GA-Core Architecture

```
+-----------+       +------------+       +-------------+
|  ETL svc  | --->  |  Gateway   | --->  |   Web App   |
+-----------+       +------------+       +-------------+
        \              |   ^                 |
         \             v   |                 v
          +--------> Neo4j/PG <-------------+
```

The vertical slice ingests data through the ETL service, persists it in Neo4j and
PostgreSQL, exposes a GraphQL API via the Gateway, and renders a tri-pane UI.
