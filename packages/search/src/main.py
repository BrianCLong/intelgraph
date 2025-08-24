from __future__ import annotations

from typing import Dict, List

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

from .pipeline.embed import TextEmbedder

app = FastAPI(title="IntelGraph Search")


documents: Dict[str, str] = {}
embedder = TextEmbedder()


class Record(BaseModel):
    id: str
    text: str


class UpsertRequest(BaseModel):
    records: List[Record]


class RetrieveRequest(BaseModel):
    query: str
    k: int = 5


@app.post("/index/upsert")
def upsert(req: UpsertRequest) -> Dict[str, int]:
    for rec in req.records:
        documents[rec.id] = rec.text
    embedder.fit(list(documents.values()))
    return {"count": len(req.records)}


@app.post("/retrieve")
def retrieve(req: RetrieveRequest) -> List[Dict[str, object]]:
    texts = list(documents.values())
    ids = list(documents.keys())
    if not texts:
        return []
    vectors = embedder.embed(texts)
    q_vec = embedder.embed([req.query])[0]
    sims = np.dot(vectors, q_vec) / (
        np.linalg.norm(vectors, axis=1) * np.linalg.norm(q_vec) + 1e-9
    )
    # simple lexical score using same vectorizer
    tfidf = embedder.vectorizer.transform(texts)
    q_tfidf = embedder.vectorizer.transform([req.query])
    bm25 = (tfidf @ q_tfidf.T).toarray().ravel()
    results = []
    for idx, doc_id in enumerate(ids):
        score = 0.5 * bm25[idx] + 0.5 * sims[idx]
        results.append(
            {
                "id": doc_id,
                "score": float(score),
                "bm25": float(bm25[idx]),
                "vector": float(sims[idx]),
                "snippet": documents[doc_id][:200],
            }
        )
    results.sort(key=lambda r: r["score"], reverse=True)
    return results[: req.k]


class SummarizeRequest(BaseModel):
    chunks: List[str]


@app.post("/summarize")
def summarize(req: SummarizeRequest) -> Dict[str, List[str]]:
    sentences: List[str] = []
    for chunk in req.chunks:
        sentences.extend([s.strip() for s in chunk.split(".") if s.strip()])
    return {"sentences": sentences[:3]}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}
