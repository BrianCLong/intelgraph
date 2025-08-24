# Analytics Methodology

Analytics tasks follow a repeatable pipeline:
1. **Feature Extraction** – derive structural and temporal metrics from the graph.
2. **Embeddings** – run node2vec to capture neighborhood context.
3. **Link Prediction** – train logistic regression on combined features and export ONNX models.
4. **Anomaly Scoring** – detect bursts or outliers on activity timelines.
Results are stored with provenance hashes for later verification.
