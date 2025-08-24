"""Scenario rule evaluation."""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Dict, List, Any

from ingest import DB

SCENARIOS: Dict[str, Dict[str, Any]] = {}


def upsert_scenario(scn: Dict[str, Any]) -> Dict[str, Any]:
    SCENARIOS[scn["key"]] = scn
    return scn


def run_scenarios() -> List[Dict[str, Any]]:
    hits: List[Dict[str, Any]] = []
    for scn in SCENARIOS.values():
        if scn.get("key") == "STRUCT" and scn.get("enabled", True):
            hits.extend(_detect_structuring(scn))
    return hits


def _detect_structuring(scn: Dict[str, Any]) -> List[Dict[str, Any]]:
    threshold = scn["rule"]["value"]
    count_needed = scn["params"]["count"]
    window_hours = scn["params"].get("windowHours", 24)
    grouped: Dict[str, List[Any]] = defaultdict(list)
    for tx in DB["transactions"]:
        if tx.get("channel") == "CASH" and tx.get("amount", 0) < threshold:
            grouped[tx["srcAcctId"]].append(tx)
    hits = []
    for acct, txs in grouped.items():
        txs = sorted(txs, key=lambda x: x["ts"])
        window = timedelta(hours=window_hours)
        start = 0
        for i in range(len(txs)):
            while txs[i]["ts"] - txs[start]["ts"] > window:
                start += 1
            if i - start + 1 >= count_needed:
                hits.append({
                    "scenarioKey": scn["key"],
                    "acctId": acct,
                    "score": 100.0,
                })
                break
    return hits
