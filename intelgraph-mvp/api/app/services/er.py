from typing import Dict, Optional

from ..graph.neo4j_client import InMemoryGraph
from ..models import Person


def merge_person(graph: InMemoryGraph, primary: Person, duplicate: Person) -> Person:
    for email in duplicate.emails:
        if email not in primary.emails:
            primary.emails.append(email)
    for phone in duplicate.phones:
        if phone not in primary.phones:
            primary.phones.append(phone)
    graph.replace_edges(duplicate.id, primary.id)
    graph.delete_node(duplicate.id)
    graph.nodes["Person"][primary.id] = primary
    return primary


def preview_features(a: Person, b: Person) -> Dict[str, bool]:
    return {
        "email_match": bool(set(a.emails) & set(b.emails)),
        "phone_match": bool(set(a.phones) & set(b.phones)),
    }
