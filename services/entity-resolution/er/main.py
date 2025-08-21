import os
from fastapi import FastAPI, HTTPException
from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import matching
from .models import Entity, AttributeEvidence, Scorecard
from .schemas import (
    MatchRequest,
    MatchResponse,
    MergeRequest,
    MergeResponse,
    ScorecardResponse,
    FeatureScore,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Entity Resolution Service")


@app.post("/er/match", response_model=MatchResponse)
def match(request: MatchRequest):
    incoming = request.entity
    session: Session = SessionLocal()
    entities = session.query(Entity).all()
    if not entities:
        raise HTTPException(status_code=404, detail="No entities to match against")
    best_candidate = None
    best_features = None
    best_total = -1.0
    for candidate in entities:
        features = matching.compute_features(incoming, candidate)
        total = matching.total_score(features)
        if total > best_total:
            best_total = total
            best_features = features
            best_candidate = candidate
    pair_id = f"temp-{best_candidate.id}"
    matching.persist_scorecard(pair_id, best_features, session)
    details = [FeatureScore(attribute=a, weight=w, score=s) for a, w, s in best_features]
    cluster = best_candidate.cluster_id or best_candidate.id
    session.close()
    return MatchResponse(cluster_id=cluster, pair_id=pair_id, score=best_total, details=details)


@app.post("/er/merge", response_model=MergeResponse)
def merge(request: MergeRequest):
    session: Session = SessionLocal()
    source = session.get(Entity, request.source_id)
    target = session.get(Entity, request.target_id)
    if not source or not target:
        raise HTTPException(status_code=404, detail="Entity not found")
    cluster = target.cluster_id or target.id
    target.cluster_id = cluster
    source.cluster_id = cluster
    pair_id = f"{source.id}-{target.id}"
    session.add(source)
    session.add(target)
    session.commit()
    matching.persist_scorecard(pair_id, [("human_override", 1.0, 1.0)], session)
    session.close()
    return MergeResponse(cluster_id=cluster, pair_id=pair_id)


@app.get("/er/explain/{pair_id}", response_model=ScorecardResponse)
def explain(pair_id: str):
    session: Session = SessionLocal()
    sc = session.query(Scorecard).filter_by(pair_id=pair_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Scorecard not found")
    evidences = (
        session.query(AttributeEvidence).filter_by(pair_id=pair_id).all()
    )
    features = [FeatureScore(attribute=e.attribute, weight=e.weight, score=e.score) for e in evidences]
    resp = ScorecardResponse(pair_id=pair_id, total_score=sc.total_score, features=features)
    session.close()
    return resp


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 7101))
    uvicorn.run(app, host="0.0.0.0", port=port)
