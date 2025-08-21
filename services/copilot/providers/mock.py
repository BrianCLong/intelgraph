from __future__ import annotations

from typing import Dict, Tuple

from .base import BaseProvider

Template = Tuple[str, Dict[str, str], str, str]

TEMPLATES: Dict[str, Template] = {
    "find person": (
        "MATCH (p:Person {name: $name}) RETURN p",
        {"name": "string"},
        "Retrieve a person node by name",
        "cypher",
    ),
    "list organizations": (
        "MATCH (o:Organization) RETURN o",
        {},
        "List all organizations",
        "cypher",
    ),
    "count relationships": (
        "MATCH ()-[r]->() RETURN COUNT(r) AS count",
        {},
        "Count all relationships",
        "cypher",
    ),
    "organization by id": (
        "MATCH (o:Organization {id: $id}) RETURN o",
        {"id": "string"},
        "Retrieve organization by id",
        "cypher",
    ),
    "people in organization": (
        "MATCH (o:Organization {name: $org})<-[:MEMBER_OF]-(p:Person) RETURN p",
        {"org": "string"},
        "List people in an organization",
        "cypher",
    ),
    "connection between": (
        "MATCH p = shortestPath((a:Entity {name: $a})-[*..4]-(b:Entity {name: $b})) RETURN p",
        {"a": "string", "b": "string"},
        "Find connections between two entities",
        "cypher",
    ),
    "recent events": (
        "MATCH (e:Event) WHERE e.date > $since RETURN e",
        {"since": "date"},
        "List events after a date",
        "cypher",
    ),
    "person emails": (
        "MATCH (p:Person {name: $name})-[:HAS_EMAIL]->(e:Email) RETURN e.address",
        {"name": "string"},
        "Get a person's email addresses",
        "cypher",
    ),
    "common neighbors": (
        "MATCH (a:Person {name: $a})--(n)--(b:Person {name: $b}) RETURN DISTINCT n",
        {"a": "string", "b": "string"},
        "Find common neighbors between two people",
        "cypher",
    ),
    "list investigations": (
        "{ investigations { id name } }",
        {},
        "GraphQL query for investigations",
        "graphql",
    ),
    "path between": (
        "MATCH p = allShortestPaths((a:Entity {name: $a})-[*]-(b:Entity {name: $b})) RETURN p",
        {"a": "string", "b": "string"},
        "Find all shortest paths between two entities",
        "cypher",
    ),
    "top connected nodes": (
        "MATCH (n) RETURN n ORDER BY degree(n) DESC LIMIT 5",
        {},
        "Show top 5 connected nodes",
        "cypher",
    ),
    "create person": (
        "CREATE (p:Person {name: $name}) RETURN p",
        {"name": "string"},
        "Create a new person node",
        "cypher",
    ),
}


class MockProvider(BaseProvider):
    async def translate(self, text: str) -> Tuple[str, Dict[str, str], str, str]:
        lt = text.lower()
        for key, tpl in TEMPLATES.items():
            if key in lt:
                query, hints, explanation, query_type = tpl
                return query, hints, explanation, query_type
        return (
            "MATCH (n) RETURN n LIMIT 5",
            {},
            "Generic listing of nodes",
            "cypher",
        )
