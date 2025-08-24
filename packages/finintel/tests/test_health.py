"""Tests for the FinIntel FastAPI health endpoint."""

from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))
from finintel.main import create_app


def test_health_endpoint() -> None:
  app = create_app()
  client = TestClient(app)
  response = client.get("/health")
  assert response.status_code == 200
  assert response.json() == {"status": "ok"}
