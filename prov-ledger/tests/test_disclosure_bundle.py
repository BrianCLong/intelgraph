import json
import subprocess
import tempfile

from fixtures import client


def create_claim_with_evidence(client, url, license_terms=None, license_owner=None):
    claim = client.post(
        "/claims/extract",
        json={"text": "Jupiter is massive."},
        headers={"X-API-Key": "testkey"},
    ).json()[0]
    evid = client.post(
        "/evidence/register",
        json={"kind": "url", "url": url, "license_terms": license_terms, "license_owner": license_owner},
        headers={"X-API-Key": "testkey"},
    ).json()
    client.post(
        f"/claims/{claim['id']}/attach",
        json={"claim_id": claim["id"], "evidence_id": evid["id"]},
        headers={"X-API-Key": "testkey"},
    )
    return claim, evid


def test_bundle_build_and_verify(client):
    claim, evid = create_claim_with_evidence(client, "http://example.com")
    resp = client.post(
        "/bundles/build",
        json={"claim_ids": [claim["id"]]},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 200
    bundle = resp.json()
    with tempfile.NamedTemporaryFile("w", delete=False) as f:
        json.dump(bundle, f)
        path = f.name
    out = subprocess.run(["python", "-m", "app.cli", path], capture_output=True, text=True)
    assert out.returncode == 0
    assert "PASS" in out.stdout


def test_bundle_blocked_by_license(client):
    claim, evid = create_claim_with_evidence(client, "http://example.com/bad", "no-export", "alice")
    resp = client.post(
        "/bundles/build",
        json={"claim_ids": [claim["id"]]},
        headers={"X-API-Key": "testkey"},
    )
    assert resp.status_code == 403
    detail = resp.json()["detail"]
    assert "alice" in detail and "no-export" in detail
