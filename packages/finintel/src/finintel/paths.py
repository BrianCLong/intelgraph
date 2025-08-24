"""Path analytics using networkx."""
from typing import List, Tuple
import networkx as nx


def k_shortest_paths(graph: nx.DiGraph, source: str, target: str, k: int) -> List[Tuple[str, ...]]:
  paths = []
  for path in nx.shortest_simple_paths(graph, source, target):
    paths.append(tuple(path))
    if len(paths) >= k:
      break
  return paths
