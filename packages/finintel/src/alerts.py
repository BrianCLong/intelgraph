"""Alert management."""
from __future__ import annotations

from typing import List, Dict, Any

ALERTS: List[Dict[str, Any]] = []


def create_alert(kind: str, subject: Dict[str, Any], score: float, explanation: Dict[str, Any]) -> Dict[str, Any]:
    alert = {
        "id": len(ALERTS) + 1,
        "kind": kind,
        "subject": subject,
        "score": score,
        "explanation": explanation,
        "status": "OPEN",
    }
    ALERTS.append(alert)
    return alert
