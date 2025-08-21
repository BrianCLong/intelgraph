



def test_extraction_and_normalization(client):
    resp = client.post(
        "/claims/extract",
        json={"text": "Paris is the capital. It has 2M people."},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["normalized"] == "paris is capital"
    assert len(data[0]["embedding"]) == 6


def test_create_claim_endpoint(client):
    resp = client.post(
        "/claims",
        json={"text": "Earth is round"},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["normalized"] == "earth is round"
    assert len(data["embedding"]) == 6
