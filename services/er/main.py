from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from datasketch import MinHash, MinHashLSH
from typing import Dict, List, Optional, Any
import time
import math
import uuid

app = FastAPI(title="Entity Resolution Service", version="0.1.0")

# In-memory stores
ENTITY_STORE: Dict[str, "Entity"] = {}
MERGE_HISTORY: List[Dict[str, Any]] = []
ADJUDICATION_QUEUE: List["CandidatePair"] = []
EXPLANATIONS: Dict[str, Dict[str, float]] = {}
AUDIT_LOG: List[Dict[str, Any]] = []


class Policy(BaseModel):
    sensitivity: str
    legal_basis: str
    retention: str


class Entity(BaseModel):
    id: str
    type: str  # Person/Org/Event/Evidence
    name: str
    attributes: Dict[str, Any] = Field(default_factory=dict)
    policy: Policy
    merged_into: Optional[str] = None


class CandidateRequest(BaseModel):
    records: List[Entity]
    threshold: float = 0.8


class CandidatePair(BaseModel):
    entity_id_a: str
    entity_id_b: str
    score: float
    rationale: Dict[str, float]
    pair_id: str


class MergeRequest(BaseModel):
    entity_ids: List[str]
    policy: Policy
    who: str
    why: str
    confidence: float = 1.0


class MergeResponse(BaseModel):
    merge_id: str
    confidence: float


class SplitRequest(BaseModel):
    merge_id: str
    who: str
    why: str


class ExplainResponse(BaseModel):
    pair_id: str
    features: Dict[str, float]
    rationale: str


def _tokenize(entity: Entity) -> List[str]:
    tokens = entity.name.lower().split()
    for v in entity.attributes.values():
        if isinstance(v, str):
            tokens.extend(v.lower().split())
    return tokens


def _minhash(tokens: List[str]) -> MinHash:
    m = MinHash(num_perm=32)
    for t in tokens:
        m.update(t.encode("utf8"))
    return m


def _features(a: Entity, b: Entity) -> Dict[str, float]:
    ta = set(_tokenize(a))
    tb = set(_tokenize(b))
    jaccard = len(ta & tb) / len(ta | tb) if ta or tb else 0.0
    return {"name_jaccard": jaccard}


def _decay(confidence: float, ts: float) -> float:
    age_days = (time.time() - ts) / 86400
    return confidence * math.exp(-0.1 * age_days)


@app.post("/er/candidates", response_model=List[CandidatePair])
def generate_candidates(req: CandidateRequest) -> List[CandidatePair]:
    lsh = MinHashLSH(threshold=req.threshold, num_perm=32)
    minhashes: Dict[str, MinHash] = {}

    for ent in req.records:
        ENTITY_STORE[ent.id] = ent
        mh = _minhash(_tokenize(ent))
        minhashes[ent.id] = mh
        lsh.insert(ent.id, mh)

    pairs: List[CandidatePair] = []
    seen = set()
    for ent in req.records:
        matches = lsh.query(minhashes[ent.id])
        for m_id in matches:
            if m_id == ent.id:
                continue
            key = tuple(sorted([ent.id, m_id]))
            if key in seen:
                continue
            seen.add(key)
            ent_b = ENTITY_STORE[m_id]
            feats = _features(ent, ent_b)
            score = feats["name_jaccard"]
            pair_id = f"{key[0]}::{key[1]}"
            pair = CandidatePair(
                entity_id_a=key[0],
                entity_id_b=key[1],
                score=score,
                rationale=feats,
                pair_id=pair_id,
            )
            if score >= req.threshold:
                pairs.append(pair)
                ADJUDICATION_QUEUE.append(pair)
                EXPLANATIONS[pair_id] = feats
    return pairs


@app.post("/er/merge", response_model=MergeResponse)
def merge_entities(req: MergeRequest) -> MergeResponse:
    if len(req.entity_ids) < 2:
        raise HTTPException(status_code=400, detail="need at least two ids")
    root_id = req.entity_ids[0]
    ts = time.time()
    for eid in req.entity_ids[1:]:
        if eid in ENTITY_STORE:
            ENTITY_STORE[eid].merged_into = root_id
    merge_id = str(uuid.uuid4())
    MERGE_HISTORY.append(
        {
            "merge_id": merge_id,
            "entity_ids": req.entity_ids,
            "policy": req.policy.model_dump(),
            "timestamp": ts,
            "confidence": req.confidence,
        }
    )
    AUDIT_LOG.append(
        {
            "action": "merge",
            "who": req.who,
            "why": req.why,
            "merge_id": merge_id,
            "entity_ids": req.entity_ids,
            "policy": req.policy.model_dump(),
            "timestamp": ts,
        }
    )
    return MergeResponse(merge_id=merge_id, confidence=_decay(req.confidence, ts))


@app.post("/er/split")
def split_merge(req: SplitRequest) -> Dict[str, str]:
    for merge in MERGE_HISTORY:
        if merge["merge_id"] == req.merge_id:
            for eid in merge["entity_ids"][1:]:
                if eid in ENTITY_STORE:
                    ENTITY_STORE[eid].merged_into = None
            AUDIT_LOG.append(
                {
                    "action": "split",
                    "who": req.who,
                    "why": req.why,
                    "merge_id": req.merge_id,
                    "timestamp": time.time(),
                }
            )
            return {"status": "ok"}
    raise HTTPException(status_code=404, detail="merge not found")


@app.get("/er/explain", response_model=ExplainResponse)
def explain(pair_id: str) -> ExplainResponse:
    feats = EXPLANATIONS.get(pair_id)
    if not feats:
        raise HTTPException(status_code=404, detail="pair not found")
    rationale = "Jaccard similarity on name and attributes"
    return ExplainResponse(pair_id=pair_id, features=feats, rationale=rationale)


@app.get("/er/audit")
def audit() -> List[Dict[str, Any]]:
    return AUDIT_LOG
