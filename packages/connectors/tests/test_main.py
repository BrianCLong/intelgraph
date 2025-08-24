import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
CONNECTORS_SRC = ROOT / "packages" / "connectors" / "src"
if str(CONNECTORS_SRC) not in sys.path:
    sys.path.insert(0, str(CONNECTORS_SRC))

from connectors.main import app  # type: ignore

client = TestClient(app)


def test_create_and_run_csv_pipeline(tmp_path):
    csv_path = tmp_path / "data.csv"
    csv_path.write_text("id,name\n1,Alice\n2,Bob\n")

    res = client.post(
        "/sources/create",
        json={"kind": "csv", "name": "people", "config": {"path": str(csv_path)}},
    )
    assert res.status_code == 200
    source_id = res.json()["id"]

    res = client.post("/sources/test", params={"source_id": source_id})
    assert res.status_code == 200
    assert res.json()["ok"]

    res = client.post("/pipelines/create", json={"name": "p", "source_id": source_id})
    pipeline_id = res.json()["id"]

    res = client.post("/pipelines/run", json={"pipeline_id": pipeline_id})
    assert res.status_code == 200
    run = res.json()
    assert run["status"] == "SUCCEEDED"
    assert run["stats"]["row_count"] == 2
