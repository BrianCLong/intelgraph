

def test_provenance_graph(client):
    claim = client.post(
        "/claims",
        json={"text": "Mars was visited."},
        headers={"X-API-Key": "testkey"},
    ).json()
    evid = client.post(
        "/evidence",
        json={"kind": "url", "url": "http://nasa.gov"},
        headers={"X-API-Key": "testkey"},
    ).json()
    client.post(
        f"/claims/{claim['id']}/attach",
        json={"claim_id": claim["id"], "evidence_id": evid["id"]},
        headers={"X-API-Key": "testkey"},
    )
    resp = client.get(f"/claims/{claim['id']}/ledger", headers={"X-API-Key": "testkey"})
    data = resp.json()
    node_ids = {n["id"] for n in data["nodes"]}
    assert claim["id"] in node_ids
    assert evid["id"] in node_ids

    bundle = client.get(
        f"/bundles/{claim['id']}/export", headers={"X-API-Key": "testkey"}
    ).json()
    bundle_ids = {n["id"] for n in bundle["nodes"]}
    assert claim["id"] in bundle_ids
    assert evid["id"] in bundle_ids
