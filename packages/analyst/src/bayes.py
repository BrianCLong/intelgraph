from typing import Dict

def update(prior: float, likelihood_true: float, likelihood_false: float) -> float:
    numerator = likelihood_true * prior
    denominator = numerator + likelihood_false * (1 - prior)
    return numerator / denominator
