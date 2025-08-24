from __future__ import annotations


from .fixtures import client


def test_ethics_block(monkeypatch):
    c = client()
    payload = {"subgraph": {"nodes": [{"id": "A"}], "edges": []}, "outputs": [], "model": {"name": "m", "version": "1"}, "options": {"text": "persuade"}}
    res = c.post("/xai/explain", json=payload, headers={"x-api-key": "test"})
    assert res.status_code == 400


def test_invalid_api_key(monkeypatch):
    monkeypatch.setenv("AUTH_MODE", "apikey")
    monkeypatch.setenv("API_KEYS", "valid")
    from app.config import get_settings

    get_settings.cache_clear()
    c = client()
    res = c.post(
        "/xai/explain",
        json={"subgraph": {"nodes": [], "edges": []}, "outputs": [], "model": {"name": "m", "version": "1"}},
        headers={"x-api-key": "bad"},
    )
    assert res.status_code == 401


def test_oversize(monkeypatch):
    monkeypatch.setenv("MAX_NODES", "1")
    from app.config import get_settings

    get_settings.cache_clear()
    c = client()
    payload = {"subgraph": {"nodes": [{"id": "A"}, {"id": "B"}], "edges": []}, "outputs": [], "model": {"name": "m", "version": "1"}}
    res = c.post("/xai/explain", json=payload, headers={"x-api-key": "test"})
    assert res.status_code == 413
