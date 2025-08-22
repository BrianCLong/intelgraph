from fixtures import client
import time


def test_ethics_block(client):
    resp = client.post(
        "/claims/extract",
        json={"text": "Please influence the audience."},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "disallowed_persuasion_output"


def test_missing_api_key(client):
    resp = client.get("/healthz")
    # healthz doesn't require auth; use evidence registration to test auth
    resp2 = client.post("/claims/extract", json={"text": "a"})
    assert resp2.status_code == 401


def test_security_headers(client):
    resp = client.get("/healthz")
    headers = resp.headers
    assert headers["content-security-policy"] is not None
    assert "frame-ancestors 'none'" in headers["content-security-policy"].lower()
    assert headers["permissions-policy"] is not None
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["referrer-policy"] == "strict-origin-when-cross-origin"


def test_rate_limit_headers(client):
    # Exhaust rate limit
    for _ in range(6):
        resp = client.post(
            "/claims/extract",
            json={"text": "test"},
            headers={"X-API-Key": "testkey"}
        )
        if resp.status_code == 429:
            break
        time.sleep(0.1)
    
    assert resp.status_code == 429
    assert "retry-after" in resp.headers
    assert "rate-limit-reset" in resp.headers
    assert "x-rate-limit-limit" in resp.headers
