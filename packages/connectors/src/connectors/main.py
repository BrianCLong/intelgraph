from __future__ import annotations

import pandas as pd
from fastapi import FastAPI, HTTPException

from .models import PipelineCreate, Run, RunCreate, Source, SourceCreate
from .storage import store

app = FastAPI(title="Connectors Service")


@app.post("/sources/create", response_model=Source)
def create_source(payload: SourceCreate) -> Source:
    source = store.create_source(payload.kind, payload.name, payload.config)
    return source


@app.post("/sources/test")
def test_source(source_id: int) -> dict:
    try:
        source = store.get_source(source_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="source not found") from exc
    if source.kind == "csv":
        path = source.config.get("path")
        try:
            df = pd.read_csv(path)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=400, detail="file missing") from exc
        sample = df.head(5).to_dict(orient="records")
        return {"ok": True, "sample": sample}
    raise HTTPException(status_code=400, detail="unsupported source kind")


@app.post("/pipelines/create")
def create_pipeline(payload: PipelineCreate):
    if payload.source_id not in store.sources:
        raise HTTPException(status_code=404, detail="source not found")
    pipeline = store.create_pipeline(payload.name, payload.source_id)
    return pipeline


@app.post("/pipelines/run", response_model=Run)
def run_pipeline(payload: RunCreate) -> Run:
    pipeline_id = payload.pipeline_id
    if pipeline_id not in store.pipelines:
        raise HTTPException(status_code=404, detail="pipeline not found")
    pipeline = store.get_pipeline(pipeline_id)
    source = store.get_source(pipeline.source_id)
    run = store.create_run(pipeline_id, status="RUNNING")
    if source.kind == "csv":
        path = source.config.get("path")
        df = pd.read_csv(path)
        run.stats = {"row_count": len(df.index)}
        run.status = "SUCCEEDED"
    else:
        run.status = "FAILED"
    store.runs[run.id] = run
    return run


@app.get("/runs/{run_id}", response_model=Run)
def get_run(run_id: int) -> Run:
    if run_id not in store.runs:
        raise HTTPException(status_code=404, detail="run not found")
    return store.runs[run_id]
