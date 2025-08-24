import hashlib
import json
import uuid
from typing import Dict, List, Tuple

import networkx as nx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Graph Algorithms Service")

# Simple in-memory cache keyed by (algo, graph_hash, params, seed)
_cache: Dict[Tuple[str, str, Tuple[Tuple[str, str], ...], int], Dict] = {}


def _hash_graph(graph: Dict) -> str:
    """Create a deterministic hash of a graph description."""
    m = hashlib.sha256()
    m.update(json.dumps(graph, sort_keys=True).encode())
    return m.hexdigest()


class GraphPayload(BaseModel):
    nodes: List[str]
    edges: List[Tuple[str, str]]
    params: Dict = {}
    seed: int | None = None
    materialize: bool | None = False
    reason: str | None = None


@app.post("/algos/pagerank")
def pagerank(payload: GraphPayload):
    graph_hash = _hash_graph({"nodes": payload.nodes, "edges": payload.edges})
    key = (
        "pagerank",
        graph_hash,
        tuple(sorted(payload.params.items())),
        payload.seed or 0,
    )
    if key in _cache:
        return _cache[key]

    g = nx.DiGraph()
    g.add_nodes_from(payload.nodes)
    g.add_edges_from(payload.edges)
    # NetworkX pagerank is deterministic; seed parameter maintained for cache key
    pr = nx.pagerank(g, alpha=payload.params.get("alpha", 0.85))
    result = {"scores": pr, "runId": str(uuid.uuid4())}
    _cache[key] = result
    return result


@app.post("/algos/louvain")
def louvain(payload: GraphPayload):
    graph_hash = _hash_graph({"nodes": payload.nodes, "edges": payload.edges})
    key = (
        "louvain",
        graph_hash,
        tuple(sorted(payload.params.items())),
        payload.seed or 0,
    )
    if key in _cache:
        return _cache[key]

    g = nx.Graph()
    g.add_nodes_from(payload.nodes)
    g.add_edges_from(payload.edges)
    # NetworkX does not implement Louvain; use greedy modularity as placeholder
    communities = [list(c) for c in nx.algorithms.community.greedy_modularity_communities(g)]
    result = {"communities": communities, "runId": str(uuid.uuid4())}
    _cache[key] = result
    return result


class KPathsPayload(GraphPayload):
    source: str
    target: str
    k: int


@app.post("/algos/kpaths")
def kpaths(payload: KPathsPayload):
    graph_hash = _hash_graph({"nodes": payload.nodes, "edges": payload.edges})
    key = (
        "kpaths",
        graph_hash,
        (payload.source, payload.target, payload.k),
        tuple(sorted(payload.params.items())),
    )
    if key in _cache:
        return _cache[key]

    g = nx.DiGraph()
    g.add_nodes_from(payload.nodes)
    g.add_edges_from(payload.edges)
    paths = []
    try:
        gen = nx.shortest_simple_paths(g, payload.source, payload.target)
        for _ in range(payload.k):
            paths.append(next(gen))
    except (nx.NetworkXNoPath, StopIteration):
        pass
    result = {"paths": paths, "runId": str(uuid.uuid4())}
    _cache[key] = result
    return result


class MaterializePayload(BaseModel):
    runId: str
    tag: str
    reason: str


@app.post("/algos/materialize")
def materialize(payload: MaterializePayload):
    # A real implementation would persist the subgraph based on runId
    if not payload.reason:
        raise HTTPException(status_code=400, detail="reason required for materialization")
    return {"status": "materialized", "tag": payload.tag, "runId": payload.runId}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
