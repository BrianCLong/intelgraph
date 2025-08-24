"""FastAPI application exposing anomaly detection endpoints."""
from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .detectors import DetectorConfig, score_records

app = FastAPI(title="Anomaly Service")

# in-memory registry of detector configs
_DETECTORS: Dict[str, DetectorConfig] = {}


class ConfigRequest(BaseModel):
    configs: List[DetectorConfig]


class ScoreRequest(BaseModel):
    model_id: str
    records: List[Dict[str, float]]
    threshold: Optional[float] = None


@app.post("/anomaly/config")
def configure(req: ConfigRequest) -> Dict[str, int]:
    for cfg in req.configs:
        _DETECTORS[cfg.model_id] = cfg
    return {"count": len(req.configs)}


@app.post("/anomaly/score")
def score(req: ScoreRequest) -> Dict[str, List]:
    config = _DETECTORS.get(req.model_id)
    if not config:
        raise HTTPException(status_code=404, detail="model not found")
    scores, rationales = score_records(req.records, config)
    threshold = req.threshold if req.threshold is not None else config.params.get("threshold", 1.0)
    anomalies = []
    for idx, s in enumerate(scores):
        if s > threshold:
            anomalies.append({"index": idx, "score": s, "rationale": {
                "path": req.records[idx].get("path"),
                "features": rationales[idx],
            }})
    return {"scores": scores, "anomalies": anomalies}
