from pydantic import BaseModel
from typing import List


class EntityIn(BaseModel):
    name: str
    email: str | None = None
    type: str | None = None


class MatchRequest(BaseModel):
    entity: EntityIn


class FeatureScore(BaseModel):
    attribute: str
    weight: float
    score: float


class MatchResponse(BaseModel):
    cluster_id: int
    pair_id: str
    score: float
    details: List[FeatureScore]


class MergeRequest(BaseModel):
    source_id: int
    target_id: int


class MergeResponse(BaseModel):
    cluster_id: int
    pair_id: str


class ScorecardResponse(BaseModel):
    pair_id: str
    total_score: float
    features: List[FeatureScore]
