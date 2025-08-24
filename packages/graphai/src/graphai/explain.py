from __future__ import annotations

from typing import Any, Dict

import networkx as nx
from networkx.readwrite import json_graph

from .models.heuristics import jaccard_score


def explain_link(graph: nx.Graph, src: int, dst: int) -> Dict[str, Any]:
  """Return a simple explanation for a predicted link."""
  path = nx.shortest_path(graph, src, dst)
  sub = graph.subgraph(path)
  features = { 'jaccard': jaccard_score(graph, src, dst) }
  return {
    'subgraph': json_graph.node_link_data(sub),
    'features': features
  }
