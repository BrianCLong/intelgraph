from fastapi.testclient import TestClient
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "graph_algos_app", Path(__file__).resolve().parent.parent / "app.py"
)
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)
app = app_module.app

client = TestClient(app)


def test_pagerank_caching():
    payload = {
        "nodes": ["a", "b", "c"],
        "edges": [["a", "b"], ["b", "c"], ["c", "a"]],
        "seed": 42,
    }
    r1 = client.post("/algos/pagerank", json=payload).json()
    r2 = client.post("/algos/pagerank", json=payload).json()
    assert r1 == r2


def test_kpaths_basic():
    payload = {
        "nodes": ["a", "b", "c"],
        "edges": [["a", "b"], ["b", "c"], ["a", "c"]],
        "source": "a",
        "target": "c",
        "k": 2,
    }
    res = client.post("/algos/kpaths", json=payload).json()
    assert len(res["paths"]) == 2


def test_louvain_basic():
    payload = {
        "nodes": ["a", "b", "c", "d"],
        "edges": [["a", "b"], ["c", "d"]],
    }
    res = client.post("/algos/louvain", json=payload).json()
    assert sorted(len(c) for c in res["communities"]) == [2, 2]
