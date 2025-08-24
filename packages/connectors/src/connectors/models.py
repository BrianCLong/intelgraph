from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class Source(BaseModel):
    id: int
    kind: str
    name: str
    config: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SourceCreate(BaseModel):
    kind: str
    name: str
    config: Dict[str, Any] = Field(default_factory=dict)


class Pipeline(BaseModel):
    id: int
    name: str
    source_id: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PipelineCreate(BaseModel):
    name: str
    source_id: int


class Run(BaseModel):
    id: int
    pipeline_id: int
    status: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    stats: Dict[str, Any] = Field(default_factory=dict)


class RunCreate(BaseModel):
    pipeline_id: int
