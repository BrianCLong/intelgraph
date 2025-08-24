"""Hotspot computations using H3 indexing with exponential time decay."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Dict, List
import math

import h3


Point = Dict[str, float]


def _weight(ts: datetime, half_life_mins: float, now: datetime | None = None) -> float:
    """Return decay weight for timestamp `ts`.

    Args:
        ts: Timestamp of the event.
        half_life_mins: Half life in minutes.
        now: Optional current time for testing.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    age_mins = (now - ts).total_seconds() / 60.0
    return 0.5 ** (age_mins / half_life_mins)


def compute_hotspots(points: Iterable[Dict[str, str | float]], res: int, half_life_mins: float = 60.0) -> List[Dict[str, float]]:
    """Aggregate points into H3 cells and score with exponential decay.

    Args:
        points: iterable of dicts with `lat`, `lon`, and ISO `ts`.
        res: H3 resolution.
        half_life_mins: decay half-life in minutes.

    Returns:
        List of cells sorted by score descending.
    """
    scores: Dict[str, float] = {}
    now = datetime.now(timezone.utc)
    for p in points:
        lat = float(p["lat"])
        lon = float(p["lon"])
        ts = datetime.fromisoformat(str(p["ts"]))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        cell = h3.latlng_to_cell(lat, lon, res)
        scores[cell] = scores.get(cell, 0.0) + _weight(ts, half_life_mins, now)
    return [
        {"h3": cell, "score": score}
        for cell, score in sorted(scores.items(), key=lambda item: item[1], reverse=True)
    ]
