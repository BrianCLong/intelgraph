"""Safe Cypher templates."""
from __future__ import annotations

from typing import Dict

TEMPLATES: Dict[str, str] = {
    "people_at_org": (
        "MATCH (p:Person)-[:WORKS_AT]->(o:Org {name: $org}) RETURN p.name AS name"
    ),
    "org_of_person": (
        "MATCH (p:Person {name: $person})-[:WORKS_AT]->(o:Org) RETURN o.name AS name"
    ),
}


def render(template_id: str, params: Dict[str, str]) -> str:
    """Render a template with parameters."""
    cypher = TEMPLATES[template_id]
    for key, value in params.items():
        cypher = cypher.replace(f"${key}", f'"{value}"')
    return cypher
