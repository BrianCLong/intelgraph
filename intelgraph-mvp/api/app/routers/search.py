from typing import List

from fastapi import APIRouter, Depends, Request

from ..deps import get_tenant_case, require_clearance
from ..services.policy import has_clearance

router = APIRouter()


@router.get("/entities/search")
def search(q: str, request: Request, tc=Depends(get_tenant_case), user=Depends(require_clearance("analyst"))):
    graph = request.app.state.graph
    results = []
    for person in graph.get_nodes("Person", tc["tenant_id"], tc["case_id"]):
        if not has_clearance(person.policy, user.clearances):
            continue
        if q.lower() in person.name.lower() or any(q.lower() in e.lower() for e in person.emails):
            results.append({"id": person.id, "type": "Person", "label": person.name})
    return {"results": results}


@router.get("/views/tripane")
def tripane(entity_id: str, request: Request, tc=Depends(get_tenant_case), user=Depends(require_clearance("analyst"))):
    graph = request.app.state.graph
    node = graph.node_by_id(entity_id)
    if not node:
        return {"timeline": [], "map": [], "graph": {"nodes": [], "edges": []}}
    # timeline and map
    timeline = []
    map_points = []
    graph_nodes = [{"id": node.id, "label": getattr(node, "name", ""), "type": node.__class__.__name__}]
    graph_edges = []
    for edge in graph.edges:
        if edge.source == entity_id and edge.type == "PRESENT_AT":
            event = graph.node_by_id(edge.target)
            if not has_clearance(event.policy, user.clearances):
                continue
            timeline.append({"id": event.id, "occurred_at": str(event.occurred_at), "label": event.name})
            graph_nodes.append({"id": event.id, "label": event.name, "type": "Event"})
            graph_edges.append({"source": entity_id, "target": event.id, "type": "PRESENT_AT"})
            for edge2 in graph.edges:
                if edge2.source == event.id and edge2.type == "OCCURRED_AT":
                    loc = graph.node_by_id(edge2.target)
                    if not has_clearance(loc.policy, user.clearances):
                        continue
                    map_points.append({"id": loc.id, "lat": loc.lat, "lon": loc.lon, "label": loc.name})
                    graph_nodes.append({"id": loc.id, "label": loc.name, "type": "Location"})
                    graph_edges.append({"source": event.id, "target": loc.id, "type": "OCCURRED_AT"})
    return {"timeline": timeline, "map": map_points, "graph": {"nodes": graph_nodes, "edges": graph_edges}}
