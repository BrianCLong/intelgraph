"""FastAPI application for GA-Telecom service."""

from __future__ import annotations

from pathlib import Path
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

from .geometry import build_sectors_from_csv
from .cotravel import Event, detect_cotravel


class SectorBuildRequest(BaseModel):
    towerCsv: str
    defaultBeamwidth: float = 120
    defaultRange: float = 1000


class EventModel(BaseModel):
    msisdn_hash: str
    ts: int
    lat: float
    lon: float


class CoTravelRequest(BaseModel):
    events: List[EventModel]
    windowSecs: int
    distanceMaxMeters: float
    minSequentialHits: int


def create_app() -> FastAPI:
    app = FastAPI(title="GA-Telecom")

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    @app.post("/sectors/build")
    async def sectors_build(req: SectorBuildRequest) -> dict:
        sectors = build_sectors_from_csv(Path(req.towerCsv), req.defaultBeamwidth, req.defaultRange)
        return {
            "sectors": [
                {
                    "towerId": s.tower_id,
                    "sectorNo": s.sector_no,
                    "h3": s.h3_idx,
                    "polygonWkt": s.polygon.wkt,
                }
                for s in sectors
            ]
        }

    @app.post("/cotravel/detect")
    async def cotravel(req: CoTravelRequest) -> dict:
        events = [Event(**e.model_dump()) for e in req.events]
        pairs = detect_cotravel(
            events,
            req.windowSecs,
            req.distanceMaxMeters,
            req.minSequentialHits,
        )
        return {
            "pairs": [
                {
                    "a": p.a,
                    "b": p.b,
                    "score": p.score,
                    "path": [e.__dict__ for e in p.path],
                }
                for p in pairs
            ]
        }

    return app


app = create_app()
