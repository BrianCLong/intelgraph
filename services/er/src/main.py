"""Entity Resolution service with explainable matching and reversible merges."""

from __future__ import annotations

import hashlib
import random
from datetime import datetime
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Reproducibility
random.seed(42)
np.random.seed(42)

app = FastAPI(title="Entity Resolution v1")


class Entity(BaseModel):
    """Basic entity description used for matching."""

    id: str
    name: str
    tenant_id: str
    labels: list[str] = Field(default_factory=list)
    attributes: dict[str, Any] = Field(default_factory=dict)


class CandidateRequest(BaseModel):
    entities: list[Entity]
    threshold: float = 0.8


class FeatureVector(BaseModel):
    name_exact: float
    name_cosine: float
    jaccard: float


class CandidateMatch(BaseModel):
    match_id: str
    entity_a: str
    entity_b: str
    score: float
    features: FeatureVector


class CandidatesResponse(BaseModel):
    candidates: list[CandidateMatch]
    comparisons: int


class MergeRequest(BaseModel):
    source_id: str
    target_id: str
    reason: str
    actor: str
    labels: list[str] = Field(default_factory=list)


class SplitRequest(BaseModel):
    source_id: str
    target_id: str
    reason: str
    actor: str


class MergeResponse(BaseModel):
    merged: bool


class ExplainResponse(BaseModel):
    match_id: str
    score: float
    features: FeatureVector
    rationale: str


# In-memory stores for demo purposes
_candidate_store: dict[str, CandidateMatch] = {}
_merges: dict[str, str] = {}
_audit_log: list[dict[str, Any]] = []
_adjudication_queue: list[str] = []


def _jaccard(a: str, b: str) -> float:
    sa = set(a.lower().split())
    sb = set(b.lower().split())
    if not sa and not sb:
        return 1.0
    return len(sa & sb) / len(sa | sb)


@app.post("/er/candidates", response_model=CandidatesResponse)
def candidates(req: CandidateRequest) -> CandidatesResponse:
    names = [e.name for e in req.entities]
    vectorizer = TfidfVectorizer().fit(names)
    tfidf = vectorizer.transform(names)

    results: list[CandidateMatch] = []
    comparisons = 0

    for i in range(len(req.entities)):
        for j in range(i + 1, len(req.entities)):
            a = req.entities[i]
            b = req.entities[j]
            comparisons += 1

            name_exact = 1.0 if a.name.lower() == b.name.lower() else 0.0
            name_cosine = float(cosine_similarity(tfidf[i], tfidf[j])[0][0])
            jaccard = _jaccard(a.name, b.name)

            score = 0.6 * name_exact + 0.4 * name_cosine

            match_id = hashlib.sha256(f"{a.id}:{b.id}".encode()).hexdigest()[:12]
            match = CandidateMatch(
                match_id=match_id,
                entity_a=a.id,
                entity_b=b.id,
                score=score,
                features=FeatureVector(
                    name_exact=name_exact,
                    name_cosine=name_cosine,
                    jaccard=jaccard,
                ),
            )
            _candidate_store[match_id] = match

            if score >= req.threshold:
                results.append(match)
            elif score >= req.threshold * 0.8:
                _adjudication_queue.append(match_id)

    return CandidatesResponse(candidates=results, comparisons=comparisons)


def _most_restrictive(labels: list[str]) -> list[str]:
    order = ["public", "internal", "confidential"]
    highest = 0
    for label in labels:
        if label in order:
            highest = max(highest, order.index(label))
    return [order[highest]]


@app.post("/er/merge", response_model=MergeResponse)
def merge_entities(req: MergeRequest) -> MergeResponse:
    if req.source_id in _merges:
        raise HTTPException(status_code=400, detail="source already merged")

    merged_label = _most_restrictive(req.labels)
    _merges[req.source_id] = req.target_id
    _audit_log.append(
        {
            "action": "merge",
            "source": req.source_id,
            "target": req.target_id,
            "reason": req.reason,
            "actor": req.actor,
            "label": merged_label,
            "ts": datetime.utcnow().isoformat(),
        }
    )
    return MergeResponse(merged=True)


@app.post("/er/split", response_model=MergeResponse)
def split_entities(req: SplitRequest) -> MergeResponse:
    current = _merges.get(req.source_id)
    if current != req.target_id:
        raise HTTPException(status_code=404, detail="merge not found")

    del _merges[req.source_id]
    _audit_log.append(
        {
            "action": "split",
            "source": req.source_id,
            "target": req.target_id,
            "reason": req.reason,
            "actor": req.actor,
            "ts": datetime.utcnow().isoformat(),
        }
    )
    return MergeResponse(merged=False)


@app.get("/er/explain/{match_id}", response_model=ExplainResponse)
def explain(match_id: str) -> ExplainResponse:
    match = _candidate_store.get(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="match not found")

    parts = []
    if match.features.name_exact:
        parts.append("names match exactly")
    if match.features.name_cosine > 0.8:
        parts.append("high semantic similarity")
    if match.features.jaccard < 0.3:
        parts.append("low token overlap")
    rationale = "; ".join(parts) or "no strong signals"

    return ExplainResponse(
        match_id=match_id,
        score=match.score,
        features=match.features,
        rationale=rationale,
    )


@app.get("/er/queue", response_model=list[str])
def queue() -> list[str]:
    return list(_adjudication_queue)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8010)
