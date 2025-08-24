from importlib.machinery import SourceFileLoader
from pathlib import Path

from fastapi.testclient import TestClient

main = SourceFileLoader(
    "privacy_labeler.main", str(Path(__file__).resolve().parents[1] / "main.py")
).load_module()
app = main.app
client = TestClient(app)


def test_scan_detects_email():
    res = client.post("/privacy/scan", json={"text": "email me at foo@example.com"})
    assert res.status_code == 200
    data = res.json()
    labels = [item["label"] for item in data["labels"]]
    assert "EMAIL" in labels


def test_redact_proposals_and_apply():
    text = "call 123-456-7890"
    res = client.post("/privacy/redact-proposals", json={"text": text})
    proposals = res.json()["proposals"]
    apply_res = client.post(
        "/privacy/apply",
        json={
            "text": text,
            "proposals": proposals,
            "authority": "admin",
            "reason": "policy",
        },
    )
    assert apply_res.status_code == 200
    redacted = apply_res.json()["redacted"]
    assert "[REDACTED]" in redacted


def test_apply_requires_authority():
    res = client.post(
        "/privacy/apply",
        json={"text": "foo", "proposals": [], "authority": None, "reason": None},
    )
    assert res.status_code == 400
