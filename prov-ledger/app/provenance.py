import networkx as nx
from typing import Dict
from datetime import datetime

_graph = nx.DiGraph()


def add_claim(claim: dict) -> None:
    _graph.add_node(claim["id"], type="claim", data=claim)


def add_evidence(evid: dict) -> None:
    _graph.add_node(evid["id"], type="evidence", data=evid)


def attach(claim_id: str, evidence_id: str, agent: str = "system") -> None:
    act_id = f"attach:{claim_id}:{evidence_id}"
    _graph.add_node(
        act_id,
        type="activity",
        agent=agent,
        timestamp=datetime.utcnow().isoformat(),
    )
    _graph.add_edge(act_id, claim_id)
    _graph.add_edge(act_id, evidence_id)


def subgraph_for_claim(claim_id: str) -> nx.DiGraph:
    nodes = {claim_id}
    for act, tgt in _graph.in_edges(claim_id):
        nodes.add(act)
        nodes.add(tgt)
    for n in list(nodes):
        nodes.update(nx.descendants(_graph, n))
    return _graph.subgraph(nodes).copy()
