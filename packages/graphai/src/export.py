"""Utilities for building datasets from edge lists."""
from __future__ import annotations

from typing import Dict, Iterable, List, Tuple
import networkx as nx


def build_graph(edges: Iterable[Tuple[int, int]]) -> nx.Graph:
  """Construct an undirected graph from edge tuples."""
  graph = nx.Graph()
  graph.add_edges_from(edges)
  return graph


def export_dataset(edges: List[Tuple[int, int]]) -> Dict[str, List[Tuple[int, int]]]:
  """Create a dataset structure from edges.

  The returned object is minimal and holds edges for later processing.
  """
  graph = build_graph(edges)
  return {"edges": list(graph.edges())}
