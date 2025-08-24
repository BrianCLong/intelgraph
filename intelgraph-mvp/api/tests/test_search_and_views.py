from conftest import sample_payload


def test_search_and_views(client, auth_headers):
    payload = sample_payload()
    client.post("/ingest/csv", json=payload, headers=auth_headers)
    resp = client.get("/entities/search", params={"q": "Alice"}, headers=auth_headers)
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) == 1
    entity_id = results[0]["id"]
    view = client.get("/views/tripane", params={"entity_id": entity_id}, headers=auth_headers)
    data = view.json()
    assert len(data["timeline"]) == 2
    assert len(data["map"]) == 2
    assert len(data["graph"]["nodes"]) >= 3
