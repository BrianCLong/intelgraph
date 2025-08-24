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
    license_terms: Optional[str] = None
    license_owner: Optional[str] = None


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


class BundleRequest(BaseModel):
    claim_ids: List[str] = Field(default_factory=list)


class ManifestEntry(BaseModel):
    id: str
    hash: str


class Manifest(BaseModel):
    root: str
    entries: List[ManifestEntry]


class DisclosureBundle(BaseModel):
    bundle_id: str
    manifest: Manifest
    claims: List[Claim]
    evidence: List[Evidence]
