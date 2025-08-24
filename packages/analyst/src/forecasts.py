from typing import List

def brier_score(prob: float, outcome: bool) -> float:
    return (prob - (1.0 if outcome else 0.0)) ** 2

def aggregate_mean(judgments: List[float]) -> float:
    return sum(judgments) / len(judgments)
