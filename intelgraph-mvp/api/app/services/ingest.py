from datetime import datetime
from typing import Dict, List

from ..graph.neo4j_client import InMemoryGraph
from ..models import Policy, Provenance


def ingest_rows(
    graph: InMemoryGraph,
    rows: List[Dict[str, str]],
    mapping: Dict[str, str],
    tenant_id: str,
    case_id: str,
    user_id: str,
    provenance: Dict,
    policy: Dict,
) -> None:
    prov = Provenance(**provenance, collected_at=datetime.utcnow())
    pol = Policy(**policy)
    for row in rows:
        person_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("person.")}
        email = person_fields.get("email")
        phone = person_fields.get("phone")
        existing = graph.find_person_by_email_or_phone(email, phone, tenant_id, case_id)
        if existing:
            person_id = existing.id
            if email and email not in existing.emails:
                existing.emails.append(email)
            if phone and phone not in existing.phones:
                existing.phones.append(phone)
        else:
            person_id = graph.create_node(
                "Person",
                {
                    "tenant_id": tenant_id,
                    "case_id": case_id,
                    "created_by": user_id,
                    "created_at": datetime.utcnow(),
                    "provenance": prov,
                    "policy": pol,
                    "name": person_fields.get("name"),
                    "emails": [email] if email else [],
                    "phones": [phone] if phone else [],
                },
            )
        org_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("org.")}
        org_id = graph.create_node(
            "Org",
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow(),
                "provenance": prov,
                "policy": pol,
                "name": org_fields.get("name"),
            },
        )
        graph.create_edge(
            person_id,
            "AFFILIATED_WITH",
            org_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow(),
                "provenance": prov,
                "policy": pol,
            },
        )
        event_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("event.")}
        event_id = graph.create_node(
            "Event",
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow(),
                "provenance": prov,
                "policy": pol,
                "name": event_fields.get("name"),
                "occurred_at": datetime.fromisoformat(event_fields.get("occurred_at")),
            },
        )
        graph.create_edge(
            person_id,
            "PRESENT_AT",
            event_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow(),
                "provenance": prov,
                "policy": pol,
            },
        )
        loc_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("location.")}
        location_id = graph.create_node(
            "Location",
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow(),
                "provenance": prov,
                "policy": pol,
                "name": loc_fields.get("name"),
                "lat": float(loc_fields.get("lat")),
                "lon": float(loc_fields.get("lon")),
            },
        )
        graph.create_edge(
            event_id,
            "OCCURRED_AT",
            location_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow(),
                "provenance": prov,
                "policy": pol,
            },
        )
        doc_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("document.")}
        doc_id = graph.create_node(
            "Document",
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow(),
                "provenance": prov,
                "policy": pol,
                "title": doc_fields.get("title"),
                "url": doc_fields.get("url"),
            },
        )
        for target in [person_id, org_id, event_id, location_id]:
            graph.create_edge(
                doc_id,
                "MENTIONS",
                target,
                {
                    "tenant_id": tenant_id,
                    "case_id": case_id,
                    "created_by": user_id,
                    "created_at": datetime.utcnow(),
                    "provenance": prov,
                    "policy": pol,
                },
            )
