"""Ingestion utilities for GA-FinIntel.

This module normalizes transaction records and stores them in a global in-memory DB.
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Any

DB: Dict[str, List[Dict[str, Any]]] = {
    "kyc_profiles": [],
    "transactions": [],
}


def upsert_kyc(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    inserted = 0
    for row in rows:
        existing = next((k for k in DB["kyc_profiles"] if k["tenantId"] == row["tenantId"] and k["partyKey"] == row["partyKey"]), None)
        if existing:
            existing.update(row)
        else:
            DB["kyc_profiles"].append(row)
            inserted += 1
    return {"inserted": inserted, "updated": len(rows) - inserted}


def ingest_transactions(rows: List[Dict[str, Any]], fx_fixture: Dict[str, float]) -> Dict[str, Any]:
    """Normalize currencies and store transactions."""
    count = 0
    for row in rows:
        rate = fx_fixture.get(row.get("currency", "USD"), 1.0)
        row["fxUsdAmount"] = row.get("amount", 0) * rate
        if isinstance(row.get("ts"), str):
            row["ts"] = datetime.fromisoformat(row["ts"].replace("Z", "+00:00"))
        DB["transactions"].append(row)
        count += 1
    return {"count": count}
