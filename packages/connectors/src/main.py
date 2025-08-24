from __future__ import annotations

"""FastAPI service exposing a minimal subset of IntelGraph connectors API."""

from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime

from . import orchestrator, mapping
from .models import ConnectorKind, RunStatus, store

app = FastAPI(title="IntelGraph Connectors Demo")


class ConnectorCreate(BaseModel):
    name: str
    kind: ConnectorKind
    config: dict


@app.post("/connector/create")
def create_connector(payload: ConnectorCreate):
    conn = store.create_connector(payload.name, payload.kind, payload.config)
    # Discover a single stream immediately for file connectors
    if payload.kind == ConnectorKind.FILE:
        from .sources.file import FileSource

        source = FileSource(payload.config)
        stream = source.discover()[0]
        store.add_stream(conn.id, stream["name"], stream["schema"])
    return conn


class RunStart(BaseModel):
    connectorId: int
    mode: str = "FULL"
    mapping: str | None = None
    dq_field: str | None = None


@app.post("/run/start")
def start_run(payload: RunStart):
    run = store.create_run(payload.connectorId)
    run = orchestrator.run_pipeline(run, payload.mapping, payload.dq_field)
    run.finished_at = datetime.utcnow() if run.status != RunStatus.QUEUED else None
    return run


class DQRuleIn(BaseModel):
    target: str
    targetRef: str
    field: str


@app.post("/dq/rule")
def add_dq_rule(payload: DQRuleIn):
    rule = {"type": "not_null", "field": payload.field}
    dq = store.add_dq_rule(payload.target, payload.targetRef, rule, "FAIL")
    return dq


@app.get("/run/{run_id}")
def get_run(run_id: int):
    return store.runs[run_id]
