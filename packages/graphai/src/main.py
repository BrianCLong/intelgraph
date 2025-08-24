"""FastAPI service exposing minimal dataset and embedding APIs."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

from .export import export_dataset
from .embeds import train_node2vec
from .service_state import STORE

app = FastAPI(title="GraphAI")


class Edge(BaseModel):
  src: int
  dst: int


class DatasetExportRequest(BaseModel):
  edges: List[Edge]


class DatasetExportResponse(BaseModel):
  dataset_id: str


class EmbedTrainRequest(BaseModel):
  dataset_id: str
  dim: int = 8


class EmbedTrainResponse(BaseModel):
  model_id: str


class ScoreRequest(BaseModel):
  model_id: str
  node_ids: List[int]


class NodeScore(BaseModel):
  id: int
  score: float


class ScoreResponse(BaseModel):
  scores: List[NodeScore]


@app.post("/dataset/export", response_model=DatasetExportResponse)
def dataset_export(req: DatasetExportRequest) -> DatasetExportResponse:
  edges = [(e.src, e.dst) for e in req.edges]
  dataset = export_dataset(edges)
  dataset_id = STORE.add_dataset(dataset)
  return DatasetExportResponse(dataset_id=dataset_id)


@app.post("/embed/train", response_model=EmbedTrainResponse)
def embed_train(req: EmbedTrainRequest) -> EmbedTrainResponse:
  dataset = STORE.datasets.get(req.dataset_id)
  if dataset is None:
    raise HTTPException(status_code=404, detail="dataset not found")
  embeddings = train_node2vec(dataset["edges"], dim=req.dim)
  model_id = STORE.add_model({"embeddings": embeddings})
  return EmbedTrainResponse(model_id=model_id)


@app.post("/inference/score/nodes", response_model=ScoreResponse)
def score_nodes(req: ScoreRequest) -> ScoreResponse:
  model = STORE.models.get(req.model_id)
  if model is None:
    raise HTTPException(status_code=404, detail="model not found")
  embeddings = model["embeddings"]
  scores = []
  for node_id in req.node_ids:
    emb = embeddings.get(node_id)
    if emb is None:
      raise HTTPException(status_code=404, detail=f"node {node_id} not found")
    import numpy as np

    score = float(np.linalg.norm(emb))
    scores.append(NodeScore(id=node_id, score=score))
  return ScoreResponse(scores=scores)
