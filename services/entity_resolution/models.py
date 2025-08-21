from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class Record(BaseModel):
    """Represents an entity record used for matching."""

    id: str
    name: str | None = None
    email: str | None = None
    ssn: str | None = None
    dob: date | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    timestamp: datetime | None = None


class MatchRequest(BaseModel):
    """Request payload for the match endpoint."""

    tenant: str = Field(..., description="Tenant identifier")
    record: Record
    candidates: list[Record]


class Factor(BaseModel):
    """Per-feature explanation for a match."""

    feature: str
    score: float
    weight: float
    contribution: float


class MatchResponse(BaseModel):
    """Response returned by the match endpoint."""

    decision: str
    score: float
    factors: list[Factor]
