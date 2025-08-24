from __future__ import annotations

from datetime import datetime
from pathlib import Path

from pydantic import BaseModel, Field


class NLQuery(BaseModel):
    """Natural language query converted to Cypher."""

    query: str
    cypher: str

    def to_cypher(self) -> str:
        return self.cypher


class GraphSnapshot(BaseModel):
    """Snapshot of the graph at a specific point in time."""

    as_of: datetime = Field(default_factory=datetime.utcnow)
    nodes: list[dict] = Field(default_factory=list)
    edges: list[dict] = Field(default_factory=list)


class ExportResult(BaseModel):
    """Result of a report export."""

    path: Path
    sha256: str
