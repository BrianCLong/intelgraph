"""What-If simulator for graph scenarios."""

from __future__ import annotations

from dataclasses import dataclass
import random
from typing import Dict, Iterable, Tuple

import networkx as nx


@dataclass
class ChangeSet:
    nodes: Iterable[Tuple[str, Dict]] | None = None
    edges: Iterable[Tuple[str, str, Dict]] | None = None


def apply_changes(base: nx.Graph, changes: ChangeSet) -> nx.Graph:
    graph = base.copy()
    for node, attrs in changes.nodes or []:
        graph.add_node(node, **attrs)
    for u, v, attrs in changes.edges or []:
        graph.add_edge(u, v, **attrs)
    return graph


def run_scenario(
    base: nx.Graph,
    changes: ChangeSet,
    model: str,
    params: Dict | None = None,
    seed: int | None = None,
) -> Dict:
    """Run a deterministic simulation over a changed graph."""
    random.seed(seed)
    params = params or {}
    graph = apply_changes(base, changes)

    if model == "reach":
        start = params.get("start")
        if start is None:
            raise ValueError("reach model requires 'start' node")
        reachable = nx.descendants(graph, start) | {start}
        return {"kpi": {"reach": len(reachable)}, "seed": seed}

    if model == "shortest":
        src = params.get("src")
        dst = params.get("dst")
        if src is None or dst is None:
            raise ValueError("shortest model requires 'src' and 'dst'")
        try:
            length = nx.shortest_path_length(graph, src, dst)
        except nx.NetworkXNoPath:
            length = None
        return {"kpi": {"shortest_path": length}, "seed": seed}

    raise ValueError(f"unsupported model: {model}")
