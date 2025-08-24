# GA-GraphAI Monorepo

IntelGraph GA-GraphAI provides an end-to-end graph analytics and AI stack for
feature engineering, embeddings, model training, serving, and explainability.
The stack runs locally via Docker Compose and requires no external services.

## Quickstart

```bash
# install toolchains
npm install
pip install -e packages/graphai

# launch infrastructure and services
cd infra
cp .env.example .env
docker compose up --build
```

## Path: Load → Features → Embed → Train → Eval → Serve → Overlay → Export

1. **Load Demo Graph** – the dev seed script registers a sample graph.
2. **Materialise Features** – structural features are computed into Postgres.
3. **Compute Embeddings** – run Node2Vec on the demo graph.
4. **Train Models** – baseline heuristics and GraphSAGE link prediction.
5. **Evaluate & Register** – metrics stored with the model registry.
6. **Serve Inference** – batch and realtime endpoints from the GraphAI
   service.
7. **Explain Predictions** – GNNExplainer and feature attributions.
8. **Overlay** – predictions streamed to the Investigator canvas.
9. **Export** – model checkpoints and manifests archived to MinIO.

See [docs/architecture.md](docs/architecture.md) for an overview of the
components and data flow.
