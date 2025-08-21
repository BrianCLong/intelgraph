

def test_ethics_block(client):
    resp = client.post(
        "/claims/extract",
        json={"text": "Please influence the audience."},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "disallowed_persuasion_output"


def test_missing_api_key(client):
    _ = client.get("/healthz")
    # healthz doesn't require auth; use evidence registration to test auth
    resp2 = client.post("/claims/extract", json={"text": "a"})
    assert resp2.status_code == 401
