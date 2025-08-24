from __future__ import annotations

import uuid
from collections import defaultdict
from typing import Dict, List, Optional

from ..models import (
    Document,
    Event,
    Location,
    NodeBase,
    Org,
    Person,
    Relationship,
)


class InMemoryGraph:
    def __init__(self):
        self.nodes: Dict[str, Dict[str, NodeBase]] = defaultdict(dict)
        self.edges: List[Relationship] = []

    def create_node(self, label: str, data: dict) -> str:
        node_id = data.get("id") or str(uuid.uuid4())
        data["id"] = node_id
        model_cls = {
            "Person": Person,
            "Org": Org,
            "Location": Location,
            "Event": Event,
            "Document": Document,
        }[label]
        node = model_cls(**data)
        self.nodes[label][node_id] = node
        return node_id

    def get_nodes(self, label: str, tenant_id: str, case_id: str) -> List[NodeBase]:
        return [n for n in self.nodes.get(label, {}).values() if n.tenant_id == tenant_id and n.case_id == case_id]

    def find_person_by_email_or_phone(self, email: Optional[str], phone: Optional[str], tenant_id: str, case_id: str) -> Optional[Person]:
        for n in self.get_nodes("Person", tenant_id, case_id):
            if email and email in n.emails:
                return n
            if phone and phone in n.phones:
                return n
        return None

    def create_edge(self, source: str, rel_type: str, target: str, data: dict) -> str:
        edge_id = data.get("id") or str(uuid.uuid4())
        data.update({"id": edge_id, "source": source, "target": target, "type": rel_type})
        edge = Relationship(**data)
        self.edges.append(edge)
        return edge_id

    def node_by_id(self, node_id: str) -> Optional[NodeBase]:
        for d in self.nodes.values():
            if node_id in d:
                return d[node_id]
        return None

    def delete_node(self, node_id: str) -> None:
        for label, d in self.nodes.items():
            if node_id in d:
                del d[node_id]
                break
        self.edges = [e for e in self.edges if e.source != node_id and e.target != node_id]

    def replace_edges(self, old_id: str, new_id: str) -> None:
        for e in self.edges:
            if e.source == old_id:
                e.source = new_id
            if e.target == old_id:
                e.target = new_id
