from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class Provenance(BaseModel):
    source: str
    collected_at: datetime | None = None
    license: str | None = None
    transform_chain: List[str] = Field(default_factory=list)
    confidence: float | None = None


class Policy(BaseModel):
    origin: str | None = None
    sensitivity: str
    clearance: List[str] = Field(default_factory=list)
    legal_basis: List[str] = Field(default_factory=list)
    need_to_know: List[str] = Field(default_factory=list)


class NodeBase(BaseModel):
    id: str
    tenant_id: str
    case_id: str
    provenance: Provenance
    policy: Policy
    created_by: str
    created_at: datetime


class Person(NodeBase):
    name: str
    emails: List[str] = Field(default_factory=list)
    phones: List[str] = Field(default_factory=list)
    nationality: Optional[str] = None


class Org(NodeBase):
    name: str
    domain: Optional[str] = None


class Location(NodeBase):
    name: str
    lat: float
    lon: float


class Event(NodeBase):
    name: str
    occurred_at: datetime


class Document(NodeBase):
    title: str
    url: Optional[str] = None
    hash: Optional[str] = None


class Relationship(BaseModel):
    id: str
    tenant_id: str
    case_id: str
    source: str
    target: str
    type: str
    provenance: Provenance
    policy: Policy
    created_by: str
    created_at: datetime
    role: Optional[str] = None
