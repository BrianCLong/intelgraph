from __future__ import annotations

import json
from pathlib import Path

from .matchers import probabilistic_match
from .models import Record


def _roc_auc(y_true: list[int], y_scores: list[float]) -> float:
    pairs = sorted(zip(y_scores, y_true), reverse=True)
    pos = sum(y_true)
    neg = len(y_true) - pos
    if pos == 0 or neg == 0:
        return 0.0
    tp = fp = 0
    prev_fpr = prev_tpr = auc = 0.0
    for _score, label in pairs:
        if label:
            tp += 1
        else:
            fp += 1
        tpr = tp / pos
        fpr = fp / neg
        auc += (fpr - prev_fpr) * (tpr + prev_tpr) / 2
        prev_fpr, prev_tpr = fpr, tpr
    return auc


def _average_precision(y_true: list[int], y_scores: list[float]) -> float:
    pairs = sorted(zip(y_scores, y_true), reverse=True)
    pos = sum(y_true)
    if pos == 0:
        return 0.0
    tp = fp = 0
    prev_recall = ap = 0.0
    for _, label in pairs:
        if label:
            tp += 1
        else:
            fp += 1
        recall = tp / pos
        precision = tp / (tp + fp)
        ap += precision * (recall - prev_recall)
        prev_recall = recall
    return ap


def evaluate(dataset_path: str) -> dict[str, float]:
    """Evaluate probabilistic matcher on synthetic dataset."""

    data = json.loads(Path(dataset_path).read_text())
    y_true: list[int] = []
    y_scores: list[float] = []
    for item in data:
        record = Record(**item["record"])
        candidate = Record(**item["candidate"])
        result = probabilistic_match(item.get("tenant", "default"), record, candidate)
        y_true.append(item["label"])
        y_scores.append(result["score"])
    return {
        "roc_auc": _roc_auc(y_true, y_scores),
        "average_precision": _average_precision(y_true, y_scores),
    }


__all__ = ["evaluate"]
