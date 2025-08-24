from app.main import app
from fastapi.testclient import TestClient

from conftest import sample_payload


def test_ingest_and_er(client, auth_headers):
    payload = sample_payload()
    resp = client.post("/ingest/csv", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    graph = app.state.graph
    persons = graph.get_nodes("Person", "t1", "c1")
    assert len(persons) == 2
    alice_nodes = [p for p in persons if "alice@example.com" in p.emails]
    assert len(alice_nodes) == 1
    edges_types = {e.type for e in graph.edges}
    assert {"AFFILIATED_WITH", "PRESENT_AT", "OCCURRED_AT"}.issubset(edges_types)
