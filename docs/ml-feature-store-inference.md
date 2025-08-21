# ML Feature Store & Inference in the Graph Loop (Team N)

## Mission

Operationalize machine learning around the graph by building a feature store fed by pipelines and supporting online/offline inference, drift monitoring, and a human-in-the-loop review process for high-impact predictions.

## Deliverables

- **Feature Store**: typed, versioned features with materialization jobs and point-in-time joins using the Temporal Graph (Batch 3).
- **Model Registry**: model versions with stages (dev/staging/prod), signatures, evaluation metrics, and governance tags.
- **Inference**: batch jobs and online scoring endpoints that attach predictions to nodes/edges with provenance and TTL.
- **Explainability**: per-prediction feature attributions (e.g., SHAP-style summaries) and decision reasons.
- **Drift/Quality**: input/label drift detection with alerting and auto-rollback to previous models if thresholds are breached.
- **Human Review**: queue for borderline/high-risk predictions with approve/override actions and an audit trail.

## APIs

```graphql
mutation registerModel(meta: ModelMeta!, artifact: Upload!): Model!
mutation promoteModel(id: ID!, stage: Stage!): Model!
mutation score(scope: ScoreScope!, modelId: ID!): Job!
query predictions(entityId: ID!): [Prediction!]
```

## Observability & Security

- **Metrics**: prediction QPS/latency, drift scores, override rate, model win-loss.
- **Security**: model artifacts signed and scanned; PII-safe features; least-privilege model service account.

## End-to-End Tests

1. Register and promote a model.
2. Batch score a case dataset.
3. Explanations render for each prediction.
4. Drift alarm triggers and auto-rollbacks to previous model.
5. Human overrides are captured in a review queue.

## Milestones

- **S1**: Feature store.
- **S2**: Inference & explainability.
- **S3**: Drift monitoring & review loop.
