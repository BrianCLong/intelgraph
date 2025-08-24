"""Scoring utilities for entity resolution.

This module contains a placeholder scorer that would normally combine
feature vectors and produce match probabilities.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

from .blocking import CandidatePair


@dataclass
class ScoredPair:
    """Candidate pair annotated with a score."""

    pair: CandidatePair
    score: float


class SimpleScorer:
    """Stub probability scorer."""

    def score(self, pairs: Iterable[CandidatePair]) -> List[ScoredPair]:
        """Assign a default score to each candidate pair."""
        return [ScoredPair(pair=p, score=0.0) for p in pairs]


__all__ = ["ScoredPair", "SimpleScorer"]

