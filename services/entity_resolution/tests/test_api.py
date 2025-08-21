from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from services.entity_resolution.main import app

client = TestClient(app)


def test_match_endpoint() -> None:
    now = datetime.utcnow().isoformat()
    payload = {
        "tenant": "default",
        "record": {
            "id": "1",
            "name": "Alice Smith",
            "address": "1 Main St",
            "latitude": 40.0,
            "longitude": -70.0,
            "timestamp": now,
        },
        "candidates": [
            {
                "id": "2",
                "name": "Alice Smith",
                "address": "1 Main St",
                "latitude": 40.0,
                "longitude": -70.0,
                "timestamp": now,
            }
        ],
    }
    res = client.post("/er/match", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "merge"
    assert data["score"] == pytest.approx(1.0)
    assert data["factors"]
