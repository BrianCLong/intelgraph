from __future__ import annotations

from .fixtures import client


def build_request():
    return {
        "subgraph": {
            "nodes": [
                {"id": "A", "attrs": {"sensitive": "g1"}},
                {"id": "B", "attrs": {"sensitive": "g2"}},
                {"id": "C", "attrs": {"sensitive": "g1"}},
            ],
            "edges": [{"src": "A", "dst": "B"}, {"src": "B", "dst": "C"}],
            "directed": False,
        },
        "outputs": [
            {"task": "link", "target": {"src": "A", "dst": "C"}, "score": 0.81, "label": "present"}
        ],
        "model": {"name": "gnn-link-pred", "version": "1.0", "gradients": False},
    }


def test_explain_link():
    c = client()
    res = c.post("/xai/explain", json=build_request(), headers={"x-api-key": "test"})
    assert res.status_code == 200
    data = res.json()
    ids = {imp["id"] for imp in data["importances"]}
    assert "B" in ids
    assert any("B" in p["path"] for p in data["paths"])
    cf = data["counterfactuals"][0]
    assert cf["edits"][0]["op"] == "remove_edge"
