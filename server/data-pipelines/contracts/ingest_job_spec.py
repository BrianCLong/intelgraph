from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, validator


class MaskingStrategy(str, Enum):
    REDACTION = "REDACTION"
    TOKENIZATION = "TOKENIZATION"
    HASHING = "HASHING"
    ENCRYPTION = "ENCRYPTION"
    PARTIAL_MASK = "PARTIAL_MASK"
    SYNTHETIC = "SYNTHETIC"
    NULLIFICATION = "NULLIFICATION"


class FieldMapping(BaseModel):
    """Mapping for an individual field with optional masking strategy."""

    source: str
    target: str
    masking_mode: Optional[MaskingStrategy] = None

    @validator("masking_mode", pre=True)
    def _coerce_strategy(cls, v):
        if v is None or isinstance(v, MaskingStrategy):
            return v
        try:
            return MaskingStrategy[v.upper()]
        except KeyError as exc:
            raise ValueError(f"Unknown masking mode: {v}") from exc


class IngestJobSpec(BaseModel):
    """Contract defining an ingestion job."""

    source: Dict[str, Any]
    mapping: List[FieldMapping]
    policyTags: List[str] = []

    @validator("policyTags", pre=True, always=True)
    def _default_policy_tags(cls, v):
        return v or []


__all__ = ["IngestJobSpec", "FieldMapping", "MaskingStrategy"]
