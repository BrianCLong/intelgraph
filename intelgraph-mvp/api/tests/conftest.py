import csv
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.jwt import create_token
from app.graph.neo4j_client import InMemoryGraph

@pytest.fixture()
def client():
    app.state.graph = InMemoryGraph()
    return TestClient(app)

def sample_payload():
    csv_path = Path(__file__).resolve().parents[2] / "tools" / "sample_data" / "contacts.csv"
    with open(csv_path, "r", newline="") as f:
        rows = list(csv.DictReader(f))
    mapping = {
        "person.name": "person_name",
        "person.email": "person_email",
        "person.phone": "person_phone",
        "org.name": "org_name",
        "event.name": "event_name",
        "event.occurred_at": "event_time",
        "location.name": "location_name",
        "location.lat": "lat",
        "location.lon": "lon",
        "document.title": "doc_title",
        "document.url": "doc_url",
    }
    payload = {
        "tenant_id": "t1",
        "case_id": "c1",
        "mapping": mapping,
        "data": rows,
        "provenance": {"source": "csv", "license": "CC0"},
        "policy": {"sensitivity": "T", "clearance": ["analyst"]},
    }
    return payload

@pytest.fixture()
def auth_headers():
    token = create_token({"sub": "u1", "roles": ["analyst"], "clearances": ["analyst"], "cases": ["c1"]})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": "t1", "X-Case-ID": "c1"}
