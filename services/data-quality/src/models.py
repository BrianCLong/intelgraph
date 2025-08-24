from __future__ import annotations

from datetime import datetime
from hashlib import sha256
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class Rule(BaseModel):
    """Declarative data quality rule."""

    id: str
    field: str
    type: str
    params: Dict[str, Any] = Field(default_factory=dict)

    @validator("type")
    def validate_type(cls, v: str) -> str:
        allowed = {"regex", "range", "required", "ref"}
        if v not in allowed:
            raise ValueError(f"type must be one of {allowed}")
        return v


class EvaluationRequest(BaseModel):
    payload: Dict[str, Any]
    rules: List[Rule]


class Finding(BaseModel):
    rule_id: str
    field: str
    message: str


class QuarantineItem(BaseModel):
    id: str
    payload: Dict[str, Any]
    reason: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    previous_sha: Optional[str] = None
    sha: Optional[str] = None

    def seal(self, previous: Optional["QuarantineItem"]) -> None:
        self.previous_sha = previous.sha if previous else None
        to_hash = (previous.sha if previous else "") + str(self.payload) + self.reason
        self.sha = sha256(to_hash.encode()).hexdigest()
