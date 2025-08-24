"""Insight exploration demo script.
Originally provided as a Jupyter notebook; converted to plain Python
so repository diffs avoid binary content issues.
"""
from __future__ import annotations
import networkx as nx

def main() -> None:
    """Builds a small graph and prints PageRank scores."""
    g = nx.Graph()
    g.add_edges_from([
        ("Alice", "Bob"),
        ("Bob", "Carol"),
        ("Carol", "Dave"),
        ("Alice", "Eve"),
    ])
    scores = nx.pagerank(g)
    for node, score in scores.items():
        print(f"{node}: {score:.3f}")

if __name__ == "__main__":
    main()
