from __future__ import annotations

import networkx as nx
from node2vec import Node2Vec
from pandas import DataFrame


def node2vec_embed(graph: nx.Graph, dimensions: int = 16) -> DataFrame:
  """Generate Node2Vec embeddings for all nodes."""
  n2v = Node2Vec(graph, dimensions=dimensions, quiet=True)
  model = n2v.fit(window=5, min_count=1, batch_words=4)
  rows = []
  for node in graph.nodes():
    rows.append({'node': node, 'embedding': model.wv[str(node)].tolist()})
  return DataFrame(rows)
