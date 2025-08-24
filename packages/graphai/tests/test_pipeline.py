import networkx as nx
from graphai.features import structural_features
from graphai.embed import node2vec_embed
from graphai.models.heuristics import evaluate_heuristic, sample_negative_edges
from graphai.explain import explain_link


def build_graph():
  g = nx.Graph()
  g.add_edges_from([(1, 2), (2, 3), (3, 1)])
  return g


def test_features():
  g = build_graph()
  df = structural_features(g)
  assert len(df) == 3
  assert 'pagerank' in df.columns


def test_node2vec():
  g = build_graph()
  df = node2vec_embed(g, dimensions=4)
  assert len(df) == 3
  assert len(df.iloc[0]['embedding']) == 4


def test_heuristic_auc():
  g = build_graph()
  positives = list(g.edges())
  negatives = sample_negative_edges(g, len(positives))
  auc = evaluate_heuristic(g, positives, negatives)
  assert 0.5 <= auc <= 1.0


def test_explain_link():
  g = build_graph()
  data = explain_link(g, 1, 3)
  assert 'subgraph' in data and 'features' in data
