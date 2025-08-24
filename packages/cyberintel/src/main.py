"""Minimal FastAPI service exposing feed import and correlation."""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from .modules import feeds, logs as logmod, correlate

app = FastAPI(title="CyberIntel Service")

STATE = {"indicators": [], "logs": []}


class FeedInput(BaseModel):
  kind: str
  path: str


class LogInput(BaseModel):
  path: str


@app.post("/feed/import")
async def import_feed(inp: FeedInput):
  indicators = feeds.import_feed(inp.kind, inp.path)
  STATE["indicators"].extend(indicators)
  return {"count": len(indicators)}


@app.post("/logs/load")
async def load_logs(inp: LogInput):
  entries = logmod.load_dns(inp.path)
  STATE["logs"].extend(entries)
  return {"count": len(entries)}


@app.post("/correlate/run")
async def run_correlation():
  sightings = correlate.correlate(STATE["indicators"], STATE["logs"])
  return {"sightings": sightings}


@app.get("/health")
async def health():
  return {"status": "ok"}
