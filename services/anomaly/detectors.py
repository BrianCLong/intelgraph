"""Simple anomaly detectors used by the anomaly service."""
from __future__ import annotations

from typing import Dict, Iterable, List, Tuple

import numpy as np
import torch
from pydantic import BaseModel


class DetectorConfig(BaseModel):
    """Configuration for a detector."""

    model_id: str
    model_version: str
    detector: str  # 'ewma', 'mad', 'graph'
    params: Dict[str, object]
    seed: int = 0


def _top_features(values: np.ndarray, baseline: np.ndarray, names: List[str], k: int = 3) -> List[str]:
    """Return feature names with the largest absolute deviation."""
    deltas = np.abs(values - baseline)
    idx = np.argsort(deltas)[::-1][:k]
    return [names[i] for i in idx]


def ewma_score(batch: np.ndarray, config: DetectorConfig) -> Tuple[np.ndarray, List[List[str]]]:
    alpha = config.params.get("alpha", 0.3)
    baseline = np.asarray(config.params.get("baseline", np.zeros(batch.shape[1])), dtype=float)
    ewma = alpha * batch + (1 - alpha) * baseline
    scores = np.linalg.norm(batch - ewma, axis=1)
    rationales = [_top_features(x, ewma[i], config.params.get("feature_names", [])) for i, x in enumerate(batch)]
    return scores, rationales


def mad_score(batch: np.ndarray, config: DetectorConfig) -> Tuple[np.ndarray, List[List[str]]]:
    median = np.asarray(config.params.get("median", np.zeros(batch.shape[1])), dtype=float)
    mad = np.asarray(config.params.get("mad", np.ones(batch.shape[1])), dtype=float)
    scores = np.linalg.norm((batch - median) / (mad + 1e-6), axis=1)
    rationales = [_top_features(x, median, config.params.get("feature_names", [])) for x in batch]
    return scores, rationales


def graph_rarity_score(paths: Iterable[List[str]], config: DetectorConfig) -> Tuple[np.ndarray, List[List[str]]]:
    rare_paths = set(tuple(p) for p in config.params.get("rare_paths", []))
    scores = []
    rationales: List[List[str]] = []
    for path in paths:
        rarity = 1.0 if tuple(path) in rare_paths else 0.0
        scores.append(rarity)
        rationales.append(path[:3])  # minimal path rationale
    return np.asarray(scores, dtype=float), rationales


DETECTOR_FUNCS = {
    "ewma": ewma_score,
    "mad": mad_score,
    "graph": graph_rarity_score,
}


def score_records(records: List[Dict[str, float]], config: DetectorConfig) -> Tuple[List[float], List[List[str]]]:
    torch.manual_seed(config.seed)
    np.random.seed(config.seed)
    feature_names = list(records[0].keys()) if records else []
    batch = np.asarray([[r.get(f, 0.0) for f in feature_names] for r in records], dtype=float)
    detector = DETECTOR_FUNCS[config.detector]
    if config.detector == "graph":
        paths = [r.get("path", []) for r in records]
        scores, rationales = detector(paths, config)
    else:
        config.params.setdefault("feature_names", feature_names)
        scores, rationales = detector(batch, config)
    return scores.tolist(), rationales
