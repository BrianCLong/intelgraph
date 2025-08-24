from __future__ import annotations

from .fixtures import client
from .test_api_explain_link import build_request


def test_path_endpoint():
    c = client()
    res = c.post("/xai/explain/path", json=build_request(), headers={"x-api-key": "test"})
    assert res.status_code == 200
    data = res.json()
    assert any("B" in p["path"] for p in data["paths"])


def test_counterfactual_endpoint():
    c = client()
    res = c.post("/xai/explain/counterfactual", json=build_request(), headers={"x-api-key": "test"})
    assert res.status_code == 200
    data = res.json()
    cf = data["counterfactuals"][0]
    assert cf["edits"][0]["op"] == "remove_edge"


def test_fairness_endpoint(monkeypatch):
    monkeypatch.setenv("FAIRNESS_ENABLED", "1")
    from app.config import get_settings

    get_settings.cache_clear()
    c = client()
    res = c.post("/xai/report/fairness", json=build_request(), headers={"x-api-key": "test"})
    assert res.status_code == 200
    data = res.json()
    assert data["fairness"]["enabled"] is True
    assert set(data["fairness"]["parity"].keys()) == {"g1", "g2"}


def test_robustness_endpoint():
    c = client()
    res = c.post("/xai/report/robustness", json=build_request(), headers={"x-api-key": "test"})
    assert res.status_code == 200
    data = res.json()
    assert "stability" in data["robustness"]


def test_deterministic_robustness():
    c = client()
    req = build_request()
    r1 = c.post("/xai/report/robustness", json=req, headers={"x-api-key": "test"}).json()
    r2 = c.post("/xai/report/robustness", json=req, headers={"x-api-key": "test"}).json()
    assert r1["robustness"] == r2["robustness"]


def test_deterministic_explain():
    c = client()
    req = build_request()
    r1 = c.post("/xai/explain", json=req, headers={"x-api-key": "test"}).json()
    r2 = c.post("/xai/explain", json=req, headers={"x-api-key": "test"}).json()
    assert r1["importances"] == r2["importances"]
    assert r1["paths"] == r2["paths"]
