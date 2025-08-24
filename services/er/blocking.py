"""Blocking strategies for entity resolution.

This module defines placeholder classes for different blocking techniques
such as MinHash for textual fields and geohash for locations.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Tuple


@dataclass
class CandidatePair:
    """Represents a pair of entity IDs considered for matching."""

    left_id: str
    right_id: str


class MinHashBlocker:
    """Simple placeholder MinHash blocker."""

    def block(self, records: Iterable[dict]) -> List[CandidatePair]:
        """Generate candidate pairs from an iterable of records.

        The current implementation is a stub that returns an empty list.
        """
        return []


class GeohashBlocker:
    """Placeholder geohash blocker for geospatial data."""

    def block(self, records: Iterable[dict]) -> List[CandidatePair]:
        """Generate candidate pairs based on geospatial proximity."""
        return []


__all__ = ["CandidatePair", "MinHashBlocker", "GeohashBlocker"]

