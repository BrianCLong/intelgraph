import networkx as nx

from ..manifest import build_manifest


def export(graph: nx.DiGraph) -> dict:
    nodes = [{"id": n, **graph.nodes[n]} for n in graph.nodes]
    edges = [{"source": u, "target": v} for u, v in graph.edges]
    evidence = [
        graph.nodes[n]["data"] for n in graph.nodes if graph.nodes[n].get("type") == "evidence"
    ]
    manifest = build_manifest(evidence)
    return {"nodes": nodes, "edges": edges, "metadata": {}, "manifest": manifest}
