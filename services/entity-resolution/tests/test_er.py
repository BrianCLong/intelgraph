import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from er.main import app
from er.database import SessionLocal, DB_PATH, engine
from er.models import Entity, Scorecard, AttributeEvidence
from er.bootstrap import main as bootstrap_main

client = TestClient(app)


def setup_module(module):
    engine.dispose()
    if DB_PATH.exists():
        DB_PATH.unlink()
    bootstrap_main()
    session = SessionLocal()
    session.add_all([
        Entity(name="Alice Smith", email="alice@example.com", type="Person"),
        Entity(name="Alicia S.", email="alice@example.com", type="Person"),
        Entity(name="Bob Corp", email="info@bobcorp.com", type="Org"),
    ])
    session.commit()
    session.close()


def test_match_and_explain():
    payload = {"entity": {"name": "Alice Smith", "email": "alice@example.com", "type": "Person"}}
    resp = client.post("/er/match", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["cluster_id"] in [1, 2]
    pair_id = data["pair_id"]
    explain = client.get(f"/er/explain/{pair_id}")
    assert explain.status_code == 200
    sc = explain.json()
    attrs = {f["attribute"] for f in sc["features"]}
    assert "email_exact" in attrs


def test_merge():
    resp = client.post("/er/merge", json={"source_id": 2, "target_id": 1})
    assert resp.status_code == 200
    session = SessionLocal()
    e1 = session.get(Entity, 1)
    e2 = session.get(Entity, 2)
    assert e1.cluster_id == e2.cluster_id
    sc = session.query(Scorecard).filter_by(pair_id="2-1").first()
    ev = session.query(AttributeEvidence).filter_by(pair_id="2-1").first()
    assert sc is not None and ev.attribute == "human_override"
    session.close()
