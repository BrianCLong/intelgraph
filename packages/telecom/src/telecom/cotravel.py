"""Co-travel detection utilities."""

from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from typing import Dict, List

from math import radians, sin, cos, sqrt, atan2


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in meters between two lat/lon points."""

    R = 6371000.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


@dataclass
class Event:
    msisdn_hash: str
    ts: int  # epoch seconds
    lat: float
    lon: float


@dataclass
class PairPath:
    a: str
    b: str
    score: int
    path: List[Event]


def detect_cotravel(
    events: List[Event],
    window_secs: int,
    distance_max_m: float,
    min_sequential_hits: int,
) -> List[PairPath]:
    """Detect co-travel pairs from a list of events."""

    # Group events by subscriber
    by_sub: Dict[str, List[Event]] = {}
    for ev in sorted(events, key=lambda e: e.ts):
        by_sub.setdefault(ev.msisdn_hash, []).append(ev)

    pairs: List[PairPath] = []
    for a, b in combinations(by_sub.keys(), 2):
        seq = []
        ia = ib = 0
        ea = by_sub[a]
        eb = by_sub[b]
        while ia < len(ea) and ib < len(eb):
            e1 = ea[ia]
            e2 = eb[ib]
            dt = abs(e1.ts - e2.ts)
            if dt <= window_secs and haversine(e1.lat, e1.lon, e2.lat, e2.lon) <= distance_max_m:
                seq.append(e1)
                ia += 1
                ib += 1
            elif e1.ts < e2.ts:
                ia += 1
                if seq:
                    seq = []
            else:
                ib += 1
                if seq:
                    seq = []
        if len(seq) >= min_sequential_hits:
            pairs.append(PairPath(a=a, b=b, score=len(seq), path=seq))
    return pairs
