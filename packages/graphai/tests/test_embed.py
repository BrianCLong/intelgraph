import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from packages.graphai.src.main import app


client = TestClient(app)


def test_export_and_train_and_score() -> None:
  resp = client.post(
    "/dataset/export", json={"edges": [{"src": 1, "dst": 2}, {"src": 2, "dst": 3}, {"src": 3, "dst": 1}]}
  )
  assert resp.status_code == 200
  dataset_id = resp.json()["dataset_id"]

  resp = client.post("/embed/train", json={"dataset_id": dataset_id, "dim": 4})
  assert resp.status_code == 200
  model_id = resp.json()["model_id"]

  resp = client.post(
    "/inference/score/nodes", json={"model_id": model_id, "node_ids": [1, 2, 3]}
  )
  assert resp.status_code == 200
  scores = resp.json()["scores"]
  assert len(scores) == 3
  assert all(s["score"] > 0 for s in scores)
