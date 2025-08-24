from __future__ import annotations

import uuid
from typing import Dict

import networkx as nx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .features import structural_features
from .embed import node2vec_embed
from .models.heuristics import (
  evaluate_heuristic,
  jaccard_score,
  sample_negative_edges
)
from .explain import explain_link
from .registry import Model, register

app = FastAPI()

# in-memory graph store
_GRAPHS: Dict[str, nx.Graph] = {}


class GraphIn(BaseModel):
  name: str
  nodeQuery: str
  edgeQuery: str


@app.post('/graph/register')
def register_graph(payload: GraphIn) -> Dict[str, str]:
  graph_id = str(uuid.uuid4())
  g = nx.Graph()
  g.add_edges_from([(1, 2), (2, 3), (3, 1)])
  _GRAPHS[graph_id] = g
  return { 'id': graph_id, 'name': payload.name }


@app.post('/features/materialize/{graph_id}')
def materialize_features(graph_id: str):
  g = _GRAPHS.get(graph_id)
  if not g:
    raise HTTPException(404)
  df = structural_features(g)
  return df.to_dict(orient='records')


@app.post('/embed/node2vec/{graph_id}')
def embed_node2vec(graph_id: str):
  g = _GRAPHS.get(graph_id)
  if not g:
    raise HTTPException(404)
  df = node2vec_embed(g)
  return df.to_dict(orient='records')


class TrainIn(BaseModel):
  graphId: str
  modelName: str


@app.post('/train/link')
def train_link(in_: TrainIn):
  g = _GRAPHS.get(in_.graphId)
  if not g:
    raise HTTPException(404)
  positives = list(g.edges())
  negatives = sample_negative_edges(g, len(positives))
  auc = evaluate_heuristic(g, positives, negatives)
  model_id = str(uuid.uuid4())
  register(Model(id=model_id, name=in_.modelName, type='heuristic', metrics={'auc': auc}))
  return { 'modelId': model_id, 'auc': auc }


class PredictIn(BaseModel):
  modelId: str
  node: int
  topK: int = 2


@app.post('/predict/link')
def predict_link(in_: PredictIn):
  g = next((g for g_id, g in _GRAPHS.items() if g_id == in_.modelId[:36]), None)
  if not g:
    raise HTTPException(404)
  scores = []
  for v in g.nodes():
    if g.has_edge(in_.node, v) or in_.node == v:
      continue
    scores.append({'dst': v, 'score': jaccard_score(g, in_.node, v)})
  scores.sort(key=lambda x: x['score'], reverse=True)
  return scores[:in_.topK]


class ExplainIn(BaseModel):
  graphId: str
  src: int
  dst: int


@app.post('/explain/link')
def explain(in_: ExplainIn):
  g = _GRAPHS.get(in_.graphId)
  if not g:
    raise HTTPException(404)
  return explain_link(g, in_.src, in_.dst)


@app.get('/health')
def health():
  return { 'status': 'ok' }
