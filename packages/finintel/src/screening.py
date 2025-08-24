"""Simple watchlist screening."""
from __future__ import annotations

from typing import Dict, List, Any

from ingest import DB

WATCHLISTS: Dict[str, List[Dict[str, Any]]] = {
    "SANCTIONS": [],
    "PEP": [],
}


def load_watchlist(kind: str, rows: List[Dict[str, Any]]) -> None:
    WATCHLISTS[kind] = rows


def run_screen(kind: str) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    wl = WATCHLISTS.get(kind, [])
    for profile in DB["kyc_profiles"]:
        for entry in wl:
            if profile["name"].lower() == entry["name"].lower():
                results.append({
                    "watchlist": kind,
                    "refType": "PARTY",
                    "refId": profile["partyKey"],
                    "value": profile["name"],
                    "method": "EXACT",
                    "score": 100.0,
                })
    return results
