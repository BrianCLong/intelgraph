from fastapi.testclient import TestClient

from .api import app


def test_ewma_scoring_deterministic():
    client = TestClient(app)
    cfg = {
        "configs": [
            {
                "model_id": "m1",
                "model_version": "1.0",
                "detector": "ewma",
                "params": {"alpha": 0.5, "baseline": [0, 0], "threshold": 0.1},
                "seed": 42,
            }
        ]
    }
    res = client.post("/anomaly/config", json=cfg)
    assert res.status_code == 200

    records = {"model_id": "m1", "records": [{"a": 0.2, "b": 0.1}, {"a": 10, "b": 10}], "threshold": 0.5}
    res = client.post("/anomaly/score", json=records)
    assert res.status_code == 200
    data = res.json()
    assert data["scores"][0] < 0.5
    assert data["anomalies"][0]["index"] == 1
    # same request again should be deterministic
    res2 = client.post("/anomaly/score", json=records)
    assert res2.json() == data
