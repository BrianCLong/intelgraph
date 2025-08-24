import importlib
import importlib.util
import os
from pathlib import Path
from types import ModuleType

from fastapi.testclient import TestClient


def load_app() -> ModuleType:
    module_path = Path(__file__).resolve().parents[1] / "app.py"
    spec = importlib.util.spec_from_file_location("fusionhub.app", module_path)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_score_endpoint() -> None:
    os.environ.pop("FEATURE_POLICY_CLASS", None)
    module = load_app()
    client = TestClient(module.app)
    resp = client.post("/score", json={"text": "hello"})
    assert resp.status_code == 200
    data = resp.json()
    assert "risk_score" in data


def test_policy_class_resolution() -> None:
    os.environ["FEATURE_POLICY_CLASS"] = "true"
    module = load_app()
    profile = module.OrgProfile(pack_id="pla", role="adversary")
    policy_class = module.resolve_policy_class(profile)
    assert policy_class == "restricted"
