"""Simple noise calibration utilities for DP aggregates."""

from __future__ import annotations

import random
from collections.abc import Iterable
from typing import List


def add_laplace_noise(values: Iterable[float], epsilon: float) -> List[float]:
    """Return values perturbed with Laplace-like noise.

    This placeholder uses Gaussian noise scaled by ``epsilon`` and is not a
    secure DP mechanism. It exists solely to facilitate early integration
    tests.
    """
    scale = 1.0 / max(epsilon, 1e-9)
    return [v + random.gauss(0, scale) for v in values]
