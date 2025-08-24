from fastapi.testclient import TestClient
from packages.search.src.main import app

client = TestClient(app)


def test_upsert_and_retrieve():
    data = {"records": [{"id": "1", "text": "Alpha Org signed a contract"}]}
    client.post("/index/upsert", json=data)
    res = client.post("/retrieve", json={"query": "Alpha Org contract", "k": 5})
    body = res.json()
    assert body[0]["id"] == "1"


def test_summarize():
    res = client.post("/summarize", json={"chunks": ["Alpha. Beta. Gamma."]})
    body = res.json()
    assert "Alpha" in body["sentences"][0]
