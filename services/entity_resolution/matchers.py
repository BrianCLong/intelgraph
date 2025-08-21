from __future__ import annotations

import math
from datetime import datetime
from typing import Any

import jellyfish

from .models import Factor, Record

# Thresholds per tenant for decisions
TENANT_THRESHOLDS: dict[str, dict[str, float]] = {"default": {"merge": 0.85, "link": 0.6}}

# Feature weights for probabilistic matcher
WEIGHTS: dict[str, float] = {"name": 0.4, "text": 0.3, "geo": 0.2, "time": 0.1}


def deterministic_match(record: Record, candidate: Record) -> dict[str, Any] | None:
    """Return a deterministic match if strong identifiers match exactly."""

    if record.email and candidate.email and record.email.lower() == candidate.email.lower():
        factor = Factor(feature="email", score=1.0, weight=1.0, contribution=1.0)
        return {"decision": "merge", "score": 1.0, "factors": [factor]}
    if record.ssn and candidate.ssn and record.ssn == candidate.ssn:
        factor = Factor(feature="ssn", score=1.0, weight=1.0, contribution=1.0)
        return {"decision": "merge", "score": 1.0, "factors": [factor]}
    if (
        record.dob
        and candidate.dob
        and record.name
        and candidate.name
        and record.dob == candidate.dob
        and record.name.lower() == candidate.name.lower()
    ):
        factor = Factor(feature="dob+name", score=1.0, weight=1.0, contribution=1.0)
        return {"decision": "merge", "score": 1.0, "factors": [factor]}
    return None


def _tfidf_similarity(a: str, b: str) -> float:
    """Compute a tiny TF-IDF cosine similarity between two strings."""

    words_a = a.lower().split()
    words_b = b.lower().split()
    if not words_a or not words_b:
        return 0.0
    doc_count: dict[str, int] = {}
    for word in set(words_a):
        doc_count[word] = doc_count.get(word, 0) + 1
    for word in set(words_b):
        doc_count[word] = doc_count.get(word, 0) + 1
    idf = {w: math.log(1 + 2 / (1 + c)) for w, c in doc_count.items()}
    tf_a = {w: words_a.count(w) for w in words_a}
    tf_b = {w: words_b.count(w) for w in words_b}

    def weight(tf: dict[str, int]) -> dict[str, float]:
        return {w: tf[w] * idf[w] for w in tf}

    vec_a = weight(tf_a)
    vec_b = weight(tf_b)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    common = set(vec_a) & set(vec_b)
    dot = sum(vec_a[w] * vec_b[w] for w in common)
    return dot / (norm_a * norm_b)


def _geo_proximity(
    lat1: float, lon1: float, lat2: float, lon2: float, radius_km: float = 50
) -> float:
    """Return a proximity score based on haversine distance."""

    # Haversine formula
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    distance = 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return max(0.0, 1 - distance / radius_km)


def _time_proximity(t1: datetime, t2: datetime, window_hours: float = 24) -> float:
    diff = abs((t1 - t2).total_seconds()) / 3600.0
    return max(0.0, 1 - diff / window_hours)


def probabilistic_match(tenant: str, record: Record, candidate: Record) -> dict[str, Any]:
    """Probabilistic matcher using multiple similarity features."""

    thresholds = TENANT_THRESHOLDS.get(tenant, TENANT_THRESHOLDS["default"])
    factors: list[Factor] = []
    total = 0.0

    # Name similarity using Jaro-Winkler
    name_score = 0.0
    if record.name and candidate.name:
        name_score = jellyfish.jaro_winkler_similarity(record.name, candidate.name)
    factors.append(
        Factor(
            feature="name_jw",
            score=name_score,
            weight=WEIGHTS["name"],
            contribution=name_score * WEIGHTS["name"],
        )
    )
    total += name_score * WEIGHTS["name"]

    # Address similarity via TF-IDF
    text_score = 0.0
    if record.address and candidate.address:
        text_score = _tfidf_similarity(record.address, candidate.address)
    factors.append(
        Factor(
            feature="address_tfidf",
            score=text_score,
            weight=WEIGHTS["text"],
            contribution=text_score * WEIGHTS["text"],
        )
    )
    total += text_score * WEIGHTS["text"]

    # Geo proximity
    geo_score = 0.0
    if (
        record.latitude is not None
        and record.longitude is not None
        and candidate.latitude is not None
        and candidate.longitude is not None
    ):
        geo_score = _geo_proximity(
            record.latitude, record.longitude, candidate.latitude, candidate.longitude
        )
    factors.append(
        Factor(
            feature="geo",
            score=geo_score,
            weight=WEIGHTS["geo"],
            contribution=geo_score * WEIGHTS["geo"],
        )
    )
    total += geo_score * WEIGHTS["geo"]

    # Time proximity
    time_score = 0.0
    if record.timestamp and candidate.timestamp:
        time_score = _time_proximity(record.timestamp, candidate.timestamp)
    factors.append(
        Factor(
            feature="time",
            score=time_score,
            weight=WEIGHTS["time"],
            contribution=time_score * WEIGHTS["time"],
        )
    )
    total += time_score * WEIGHTS["time"]

    if total >= thresholds["merge"]:
        decision = "merge"
    elif total >= thresholds["link"]:
        decision = "link"
    else:
        decision = "new"

    return {"decision": decision, "score": total, "factors": factors}


__all__ = ["deterministic_match", "probabilistic_match", "TENANT_THRESHOLDS"]
