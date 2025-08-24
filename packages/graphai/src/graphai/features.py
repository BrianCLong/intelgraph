from __future__ import annotations

import networkx as nx
from pandas import DataFrame


def structural_features(graph: nx.Graph) -> DataFrame:
  """Compute basic structural features for all nodes."""
  closeness = nx.closeness_centrality(graph)
  betweenness = nx.betweenness_centrality(graph)
  pagerank = nx.pagerank(graph)
  df = DataFrame({
    'node': list(graph.nodes()),
    'degree': [graph.degree(n) for n in graph.nodes()],
    'closeness': [closeness[n] for n in graph.nodes()],
    'betweenness': [betweenness[n] for n in graph.nodes()],
    'pagerank': [pagerank[n] for n in graph.nodes()]
  })
  return df
