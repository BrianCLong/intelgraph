from __future__ import annotations

from typing import Any, Dict, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class IngestJobRequest(BaseModel):
    """Request model for starting an ingestion job."""

    model_config = ConfigDict(populate_by_name=True)

    source_type: Literal["csv", "json", "s3"] = Field(alias="sourceType")
    source: str
    schema_map: Dict[str, str] = Field(alias="schemaMap")
    redaction_rules: Dict[str, str] = Field(
        default_factory=dict, alias="redactionRules"
    )


class JobStatus(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    status: Literal["pending", "completed", "failed"]
    processed: int = 0
    pii_summary: Dict[str, int] = Field(default_factory=dict, alias="piiSummary")


class EventEnvelope(BaseModel):
    tenantId: str
    entityType: str
    attributes: Dict[str, Any]
    provenance: Dict[str, Any]
    policy: Dict[str, Any]


def new_job_id() -> str:
    return uuid4().hex
