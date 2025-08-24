from app.main import app
from app.auth.jwt import create_token

from conftest import sample_payload


def test_provenance_and_policy(client, auth_headers):
    payload = sample_payload()
    client.post("/ingest/csv", json=payload, headers=auth_headers)
    graph = app.state.graph
    node = graph.get_nodes("Person", "t1", "c1")[0]
    assert node.provenance.source == "csv"
    assert node.policy.sensitivity == "T"


def test_clearance_denied(client, auth_headers):
    payload = sample_payload()
    client.post("/ingest/csv", json=payload, headers=auth_headers)
    token = create_token({"sub": "u2", "roles": [], "clearances": [], "cases": ["c1"]})
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": "t1", "X-Case-ID": "c1"}
    resp = client.get("/entities/search", params={"q": "Alice"}, headers=headers)
    assert resp.status_code == 403
