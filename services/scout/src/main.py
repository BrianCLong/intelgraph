"""SCOUT Search Service

Hybrid search combining dense (ANN) and lexical (BM25) retrieval with
cross-encoder reranking. Designed as a drop-in service for IntelGraph.

Endpoints
---------
POST /index/{collection}/upsert
    Batch upsert of documents into a named collection.

POST /search
    Hybrid search returning hits with scores and explanations.

The service is guarded by the `search.scout` feature flag. When the flag is
not enabled, indexing is disabled to allow read-only shadow deployment.

This module stores data in-memory for simplicity. It uses hnswlib for the ANN
index, rank_bm25 for lexical search, and a cross-encoder model for reranking.
"""

from __future__ import annotations

import os
import time
import uuid
import logging
from typing import Any, Dict, List, Optional

import hnswlib
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder, SentenceTransformer

logger = logging.getLogger("scout")

app = FastAPI(title="SCOUT Search Service")


# ---------------------------------------------------------------------------
# Feature flag helpers
# ---------------------------------------------------------------------------
FLAGSMITH_ENV_KEY = os.getenv("FLAGSMITH_ENV_KEY")
FLAGSMITH_API_URL = os.getenv(
  "FLAGSMITH_API_URL", "https://edge.api.flagsmith.com/api/v1/"
)


def is_enabled(flag: str) -> bool:
  """Check a Flagsmith feature flag."""
  if not FLAGSMITH_ENV_KEY:
    return False
  try:
    resp = requests.get(
      f"{FLAGSMITH_API_URL}flags/",
      headers={"X-Environment-Key": FLAGSMITH_ENV_KEY},
      timeout=5,
    )
    resp.raise_for_status()
    for item in resp.json():
      if item.get("feature", {}).get("name") == flag:
        return item.get("enabled", False)
  except Exception as err:  # pragma: no cover - logging only
    logger.error("Flagsmith check failed", exc_info=err)
  return False


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------
class Document(BaseModel):
  id: Optional[str] = Field(default=None, description="Unique document ID")
  text: str
  metadata: Dict[str, Any] = Field(default_factory=dict)
  tier: str = Field(default="hot", description="hot or warm")
  ttl: Optional[int] = Field(default=None, description="Time-to-live in seconds")


class UpsertRequest(BaseModel):
  documents: List[Document]


class SearchRequest(BaseModel):
  collection: str
  query: str
  k: int = 10


class SearchHit(BaseModel):
  id: str
  score: float
  metadata: Dict[str, Any]
  explanation: Dict[str, float]


class SearchResponse(BaseModel):
  hits: List[SearchHit]


# ---------------------------------------------------------------------------
# In-memory collection state
# ---------------------------------------------------------------------------
class Collection:
  def __init__(self) -> None:
    self.ids: List[str] = []
    self.texts: List[str] = []
    self.metadata: List[Dict[str, Any]] = []
    self.tiers: List[str] = []
    self.ttls: List[Optional[float]] = []
    self.index: Optional[hnswlib.Index] = None
    self.bm25: Optional[BM25Okapi] = None

  def rebuild_indexes(self) -> None:
    if not self.texts:
      return
    vectors = embedding_model.encode(self.texts, show_progress_bar=False)
    dim = vectors.shape[1]
    index = hnswlib.Index(space="cosine", dim=dim)
    index.init_index(max_elements=len(vectors), ef_construction=200, M=16)
    index.add_items(vectors, list(range(len(vectors))))
    self.index = index
    self.bm25 = BM25Okapi([t.split() for t in self.texts])

  def compact(self) -> None:
    now = time.time()
    keep = [i for i, ttl in enumerate(self.ttls) if ttl is None or ttl > now]
    if len(keep) == len(self.ids):
      return
    self.ids = [self.ids[i] for i in keep]
    self.texts = [self.texts[i] for i in keep]
    self.metadata = [self.metadata[i] for i in keep]
    self.ttls = [self.ttls[i] for i in keep]
    self.tiers = [self.tiers[i] for i in keep]
    self.rebuild_indexes()
    logger.info("event:index.collection.compacted", extra={"remaining": len(self.ids)})


collections: Dict[str, Collection] = {}


# Global models
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

def get_collection(name: str) -> Collection:
  if name not in collections:
    collections[name] = Collection()
  return collections[name]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.post("/index/{collection}/upsert")
async def upsert(collection: str, req: UpsertRequest):
  if not is_enabled("search.scout"):
    raise HTTPException(status_code=403, detail="search.scout disabled")
  col = get_collection(collection)
  for doc in req.documents:
    doc_id = doc.id or str(uuid.uuid4())
    col.ids.append(doc_id)
    col.texts.append(doc.text)
    col.metadata.append(doc.metadata)
    col.tiers.append(doc.tier)
    expiry = time.time() + doc.ttl if doc.ttl else None
    col.ttls.append(expiry)
  col.rebuild_indexes()
  return {"indexed": len(req.documents)}


@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest):
  col = collections.get(req.collection)
  if not col or not col.index or not col.bm25:
    raise HTTPException(status_code=404, detail="collection not found")
  col.compact()
  query_vec = embedding_model.encode([req.query])[0]
  labels, distances = col.index.knn_query(query_vec, k=min(req.k, len(col.ids)))
  ann_scores = 1 - distances[0]
  bm25_scores = col.bm25.get_scores(req.query.split())
  combined: Dict[int, float] = {}
  for i in range(len(col.ids)):
    combined[i] = float(ann_scores[i]) + float(bm25_scores[i])
    if col.tiers[i] == "warm":
      combined[i] *= 0.8
  top = sorted(combined.items(), key=lambda x: x[1], reverse=True)[: req.k]
  candidates = [
    (i, col.texts[i], col.metadata[i], col.ids[i], ann_scores[i], bm25_scores[i])
    for i, _ in top
  ]
  rerank_inputs = [(req.query, text) for _, text, _, _, _, _ in candidates]
  rerank_scores = reranker.predict(rerank_inputs)
  reranked = sorted(
    zip(candidates, rerank_scores), key=lambda x: x[1], reverse=True
  )
  hits = [
    SearchHit(
      id=doc_id,
      score=float(score),
      metadata=meta,
      explanation={"ann": float(ann), "bm25": float(bm)},
    )
    for ((_, _, meta, doc_id, ann, bm), score) in reranked
  ]
  return SearchResponse(hits=hits)


@app.get("/health")
async def health() -> Dict[str, str]:
  return {"status": "ok"}
