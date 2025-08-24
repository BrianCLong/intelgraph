from __future__ import annotations

import random
from typing import Iterable, Tuple

import networkx as nx
from sklearn.metrics import roc_auc_score


def common_neighbors_score(graph: nx.Graph, u: int, v: int) -> float:
  return len(list(nx.common_neighbors(graph, u, v)))


def jaccard_score(graph: nx.Graph, u: int, v: int) -> float:
  return next(nx.jaccard_coefficient(graph, [(u, v)]))[2]


def evaluate_heuristic(
  graph: nx.Graph,
  positives: Iterable[Tuple[int, int]],
  negatives: Iterable[Tuple[int, int]],
  method: str = 'jaccard'
) -> float:
  scores = []
  labels = []
  func = jaccard_score if method == 'jaccard' else common_neighbors_score
  for u, v in positives:
    scores.append(func(graph, u, v))
    labels.append(1)
  for u, v in negatives:
    scores.append(func(graph, u, v))
    labels.append(0)
  return roc_auc_score(labels, scores)


def sample_negative_edges(graph: nx.Graph, k: int) -> list[Tuple[int, int]]:
  nodes = list(graph.nodes())
  negatives: set[Tuple[int, int]] = set()
  while len(negatives) < k:
    u, v = random.sample(nodes, 2)
    if not graph.has_edge(u, v):
      negatives.add((u, v))
  return list(negatives)
