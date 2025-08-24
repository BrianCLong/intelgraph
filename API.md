# API

Excerpt from the Sentiment Service OpenAPI spec:

```yaml
openapi: 3.0.2
info:
  title: Graph Sentiment Service
  version: "0.1.0"
paths:
  /sentiment/analyze:
    post:
      summary: Analyze sentiment for an entity in graph context
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SentimentRequest"
      responses:
        "200":
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SentimentResponse"
```

See `cognitive_insights_engine/sentiment_service/openapi_spec.yaml` for the full specification.
