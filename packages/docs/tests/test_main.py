"""Tests for the docs service FastAPI app."""

import pathlib
import sys

from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from docs_service.main import DocumentRef, app

client = TestClient(app)


def test_health() -> None:
    """The health endpoint should return OK."""

    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_ingest_and_parse() -> None:
    """Uploading a file should return a document reference usable by parse."""

    files = {"file": ("test.txt", b"hello", "text/plain")}
    resp = client.post("/ingest", files=files)
    assert resp.status_code == 200
    doc = DocumentRef(**resp.json())

    parse_resp = client.post("/parse", json=doc.model_dump())
    assert parse_resp.status_code == 200
    assert parse_resp.json() == {"pages": []}
