# GA-Telecom Architecture

The GA-Telecom module comprises independent services communicating over HTTP/JSON.

```
[fixtures] -> [telecom ingestor] -> [telecom service] -> [gateway/graphql] -> [web]
```

The `telecom` FastAPI service exposes analytics endpoints consumed by the GraphQL gateway.
