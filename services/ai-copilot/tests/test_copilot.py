import os
import sys

import pytest
from fastapi.testclient import TestClient

# Add service src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

from main import app  # noqa: E402

client = TestClient(app)


def test_query_allowlist_clauses():
    resp = client.post("/copilot/query", json={"nl": "Count all nodes"})
    assert resp.status_code == 200
    data = resp.json()
    assert "MATCH" in data["generatedQuery"]
    assert "CREATE" not in data["generatedQuery"].upper()


def test_rag_returns_citation():
    resp = client.post("/copilot/rag", json={"question": "Who works at Acme?"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["citations"]
    assert "Acme" in data["answer"]


def test_redacted_content_excluded():
    resp = client.post("/copilot/rag", json={"question": "Bob"})
    assert resp.status_code == 404


def test_policy_denial_reason():
    resp = client.post("/copilot/query", json={"nl": "Please export everything"})
    assert resp.status_code == 403
    assert "Policy" in resp.json()["detail"]
