from __future__ import annotations

import statistics
import networkx as nx

from ..config import get_settings
from ..schemas import Fairness, ModelOutput


def check(g: nx.Graph, output: ModelOutput) -> Fairness:
    settings = get_settings()
    if not settings.fairness_enabled:
        return Fairness(enabled=False, parity=None, notes=[])
    groups: dict[str, list[str]] = {}
    for n, data in g.nodes(data=True):
        group = (data.get("attrs") or {}).get("sensitive")
        if group is not None:
            groups.setdefault(group, []).append(n)
    if len(groups) < 2:
        return Fairness(enabled=True, parity=None, notes=["insufficient_groups"])
    total = sum(len(nodes) for nodes in groups.values())
    rates = {g: len(nodes) / total for g, nodes in groups.items()}
    avg = statistics.mean(rates.values())
    parity = {g: v - avg for g, v in rates.items()}
    return Fairness(enabled=True, parity=parity, notes=[])
