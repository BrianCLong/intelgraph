from finintel import risk, paths
import networkx as nx


def test_risk_and_paths():
    g = nx.DiGraph()
    g.add_edge('a', 'b')
    g.add_edge('b', 'c')
    g.add_edge('c', 'a')
    scores = risk.compute(g, ['a'])
    assert scores['a'].band in {'MEDIUM','HIGH'}
    ps = paths.k_shortest_paths(g, 'a', 'c', 2)
    assert ('a', 'b', 'c') in ps
