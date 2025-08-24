import json
import os, sys
from fastapi.testclient import TestClient
sys.path.append(os.getcwd())

from services.er.main import app, ADJUDICATION_QUEUE, AUDIT_LOG

client = TestClient(app)


def load_golden():
    with open("services/er/tests/golden.json", "r", encoding="utf-8") as f:
        return json.load(f)


def test_candidates_reproducible():
    data = load_golden()
    res = client.post("/er/candidates", json={"records": data, "threshold": 0.1})
    assert res.status_code == 200
    pairs = res.json()
    assert pairs == [
        {
            "entity_id_a": "1",
            "entity_id_b": "2",
            "score": 0.2,
            "rationale": {"name_jaccard": 0.2},
            "pair_id": "1::2",
        }
    ]
    assert ADJUDICATION_QUEUE, "queue should receive candidate"


def test_merge_split_and_explain():
    data = load_golden()
    client.post("/er/candidates", json={"records": data, "threshold": 0.1})
    merge_req = {
        "entity_ids": ["1", "2"],
        "policy": {"sensitivity": "low", "legal_basis": "consent", "retention": "30d"},
        "who": "tester",
        "why": "unit test",
        "confidence": 0.9,
    }
    merge_res = client.post("/er/merge", json=merge_req)
    assert merge_res.status_code == 200
    merge_id = merge_res.json()["merge_id"]
    assert AUDIT_LOG[-1]["action"] == "merge"

    exp = client.get("/er/explain", params={"pair_id": "1::2"})
    assert exp.status_code == 200
    assert "name_jaccard" in exp.json()["features"]

    split_res = client.post(
        "/er/split", json={"merge_id": merge_id, "who": "tester", "why": "undo"}
    )
    assert split_res.status_code == 200
    assert AUDIT_LOG[-1]["action"] == "split"


def test_fairness_perturbation():
    data = load_golden()
    data[1]["name"] = "Alicia Smythe"  # small perturbation
    res = client.post("/er/candidates", json={"records": data, "threshold": 0.1})
    assert res.status_code == 200
    pairs = res.json()
    assert pairs[0]["pair_id"] == "1::2"
