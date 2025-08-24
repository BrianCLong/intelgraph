from caseops.main import app
from fastapi.testclient import TestClient


def test_health():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_create_case():
    client = TestClient(app)
    resp = client.post("/case/create", json={"title": "Test Case", "description": "example"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Case"
    assert "id" in data
