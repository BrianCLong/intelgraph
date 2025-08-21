from typing import Optional

from pydantic import BaseModel


class SubmitText(BaseModel):
    text: str
    lang: Optional[str] = None
    context: Optional[str] = None


class Claim(BaseModel):
    id: str
    text: str
    normalized: str
    embedding: Optional[list[float]] = None
    created_at: str


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


class AttachEvidenceRequest(BaseModel):
    claim_id: str
    evidence_id: str


class Corroboration(BaseModel):
    claim_id: str
    evidence_ids: list[str]
    score: float
    breakdown: dict[str, float]


class ManifestEntry(BaseModel):
    id: str
    hash: str


class Manifest(BaseModel):
    version: str
    root: str
    chain: list[ManifestEntry]


class ProvExport(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    metadata: dict[str, str]
    manifest: Manifest
