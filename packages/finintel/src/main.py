from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any

from . import ingest, screening, rules, alerts

app = FastAPI(title="GA-FinIntel")


class KYCUpsert(BaseModel):
    rows: List[Dict[str, Any]]


class TxIngest(BaseModel):
    rows: List[Dict[str, Any]]
    fxFixture: Dict[str, float]


class WatchlistLoad(BaseModel):
    kind: str
    rows: List[Dict[str, Any]]


class ScenarioUpsert(BaseModel):
    key: str
    name: str
    rule: Dict[str, Any]
    params: Dict[str, Any]
    severity: str
    enabled: bool = True


@app.post("/kyc/upsert")
def kyc_upsert(payload: KYCUpsert):
    return ingest.upsert_kyc(payload.rows)


@app.post("/ingest/transactions")
def ingest_transactions(payload: TxIngest):
    return ingest.ingest_transactions(payload.rows, payload.fxFixture)


@app.post("/watchlist/load")
def watchlist_load(payload: WatchlistLoad):
    screening.load_watchlist(payload.kind, payload.rows)
    return {"loaded": len(payload.rows)}


@app.post("/screen/run")
def screen_run(kind: str):
    results = screening.run_screen(kind)
    for res in results:
        alerts.create_alert("SCREEN", {"refId": res["refId"]}, res["score"], res)
    return {"screens": results}


@app.post("/scenario/upsert")
def scenario_upsert(payload: ScenarioUpsert):
    return {"scenario": rules.upsert_scenario(payload.dict())}


@app.post("/detect/run")
def detect_run():
    hits = rules.run_scenarios()
    for hit in hits:
        alerts.create_alert("SCENARIO", {"acctId": hit["acctId"]}, hit["score"], hit)
    return {"hits": hits}


@app.get("/alerts")
def list_alerts():
    return {"alerts": alerts.ALERTS}


@app.get("/health")
def health():
    return {"status": "ok"}
