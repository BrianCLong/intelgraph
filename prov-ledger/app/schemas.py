from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class SubmitText(BaseModel):
    text: str
    lang: Optional[str] = None
    context: Optional[str] = None


class Claim(BaseModel):
    id: str
    text: str
    normalized: str
    embedding: Optional[List[float]] = None
    created_at: str
    source_uri: Optional[str] = None
    connector: Optional[str] = None
    transforms: List[str] = []
    payload_hash: Optional[str] = None
    actor: Optional[str] = None


class Evidence(BaseModel):
    id: Optional[str] = None
    kind: str
    title: Optional[str] = None
    url: Optional[str] = None
    hash: Optional[str] = None
    mime: Optional[str] = None
    created_at: Optional[str] = None
    signed: Optional[bool] = False
    signer_fp: Optional[str] = None
    source_uri: Optional[str] = None
    connector: Optional[str] = None
    transforms: List[str] = []
    actor: Optional[str] = None


class AttachEvidenceRequest(BaseModel):
    claim_id: str
    evidence_id: str


class Corroboration(BaseModel):
    claim_id: str
    evidence_ids: List[str]
    score: float
    breakdown: Dict[str, float]


class ProvExport(BaseModel):
    nodes: List[dict]
    edges: List[dict]
    metadata: Dict[str, str]
