from __future__ import annotations

import random
import networkx as nx

from ..config import get_settings
from ..schemas import ModelOutput, Robustness


def assess(g: nx.Graph, output: ModelOutput) -> Robustness:
    settings = get_settings()
    src = output.target.get("src")
    dst = output.target.get("dst")
    if not src or not dst:
        return Robustness(stability=1.0, details={})
    stable = 0
    samples = settings.robustness_samples
    rng = random.Random(settings.random_seed)
    unstable_edges: set[str] = set()
    for _ in range(samples):
        h = g.copy()
        if h.edges:
            e = rng.choice(list(h.edges))
            h.remove_edge(*e)
        if nx.has_path(h, src, dst):
            stable += 1
        else:
            unstable_edges.add(f"{e[0]}-{e[1]}")
    settings_sample = samples if samples > 0 else 1
    stability = stable / settings_sample
    return Robustness(stability=stability, details={"unstable_edges": list(unstable_edges)})
