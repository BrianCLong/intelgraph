from __future__ import annotations

"""Pydantic models used by the connectors service.

The module contains lightweight in-memory representations for connectors,
streams, runs and DQ rules.  The goal of these models is to provide a small
vertical slice of the much larger IntelGraph system.  The data is stored in
simple Python dictionaries in lieu of a real database.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ConnectorKind(str, Enum):
    FILE = "FILE"


class Connector(BaseModel):
    id: int
    name: str
    kind: ConnectorKind
    config: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Stream(BaseModel):
    id: int
    connector_id: int
    name: str
    schema: Dict[str, Any]


class RunStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class Run(BaseModel):
    id: int
    connector_id: int
    status: RunStatus
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    stats: Dict[str, Any] = Field(default_factory=dict)
    dq_failures: List[str] = Field(default_factory=list)


class DQRule(BaseModel):
    id: int
    target: str  # "stream" or "entity"
    target_ref: str
    rule: Dict[str, Any]
    severity: str = "FAIL"
    created_at: datetime = Field(default_factory=datetime.utcnow)


# In-memory stores ----------------------------------------------------------

class Store:
    """In-memory repository storing connectors related objects.

    The store is intentionally simplistic; in a real deployment this would
    be backed by PostgreSQL.  The store is threadsafe for the purposes of
    unit tests but not designed for heavy concurrency.
    """

    def __init__(self) -> None:
        self.connectors: Dict[int, Connector] = {}
        self.streams: Dict[int, Stream] = {}
        self.runs: Dict[int, Run] = {}
        self.dq_rules: Dict[int, DQRule] = {}
        self._ids = {
            "connector": 0,
            "stream": 0,
            "run": 0,
            "dq": 0,
        }

    def _next_id(self, key: str) -> int:
        self._ids[key] += 1
        return self._ids[key]

    # Connector management -------------------------------------------------

    def create_connector(self, name: str, kind: ConnectorKind, config: Dict[str, Any]) -> Connector:
        cid = self._next_id("connector")
        conn = Connector(id=cid, name=name, kind=kind, config=config)
        self.connectors[cid] = conn
        return conn

    def add_stream(self, connector_id: int, name: str, schema: Dict[str, Any]) -> Stream:
        sid = self._next_id("stream")
        stream = Stream(id=sid, connector_id=connector_id, name=name, schema=schema)
        self.streams[sid] = stream
        return stream

    def create_run(self, connector_id: int) -> Run:
        rid = self._next_id("run")
        run = Run(id=rid, connector_id=connector_id, status=RunStatus.QUEUED)
        self.runs[rid] = run
        return run

    def add_dq_rule(self, target: str, target_ref: str, rule: Dict[str, Any], severity: str) -> DQRule:
        did = self._next_id("dq")
        dq = DQRule(id=did, target=target, target_ref=target_ref, rule=rule, severity=severity)
        self.dq_rules[did] = dq
        return dq


# Global singleton store used by the service and tests ---------------------
store = Store()
