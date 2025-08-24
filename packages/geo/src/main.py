"""FastAPI app exposing hotspot computation."""
from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

from pipeline.hotspots import compute_hotspots


class Point(BaseModel):
    lat: float
    lon: float
    ts: datetime = Field(description="ISO timestamp")


class HotspotsRequest(BaseModel):
    points: List[Point]
    res: int = Field(ge=0, le=15)
    decayHalfLifeMins: float = Field(default=60.0, gt=0)


class HotspotCell(BaseModel):
    h3: str
    score: float


class HotspotsResponse(BaseModel):
    cells: List[HotspotCell]


app = FastAPI(title="IntelGraph Geo Service")


@app.post("/hotspots/h3", response_model=HotspotsResponse)
async def hotspots(req: HotspotsRequest) -> HotspotsResponse:
    cells = compute_hotspots(
        [p.model_dump() for p in req.points], req.res, req.decayHalfLifeMins
    )
    return HotspotsResponse(cells=[HotspotCell(**c) for c in cells])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
