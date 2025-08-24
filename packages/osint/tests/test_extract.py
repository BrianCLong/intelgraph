"""Tests for the minimal OSINT service."""

from fastapi.testclient import TestClient
import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
from main import app  # type: ignore


client = TestClient(app)


def test_extract_text() -> None:
    html = "<p>Hello <b>world</b></p>"
    response = client.post("/extract/text", json={"html": html})
    assert response.status_code == 200
    assert response.json()["text"] == "Hello world"


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
