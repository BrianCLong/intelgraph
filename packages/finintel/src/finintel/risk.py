"""Simple PageRank-based risk scoring."""
from dataclasses import dataclass
from typing import Dict, Iterable
import networkx as nx


@dataclass
class Score:
  entityId: str
  score: float
  band: str


def compute(graph: nx.DiGraph, seeds: Iterable[str]) -> Dict[str, Score]:
  personalization = {n: 1.0 if n in seeds else 0.0 for n in graph.nodes}
  pr = nx.pagerank(graph, personalization=personalization, alpha=0.85)
  scores: Dict[str, Score] = {}
  for n, s in pr.items():
    val = min(100, s * 1000)
    if val < 33:
      band = 'LOW'
    elif val < 66:
      band = 'MEDIUM'
    else:
      band = 'HIGH'
    scores[n] = Score(entityId=n, score=val, band=band)
  return scores
