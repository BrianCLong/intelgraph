import os
import sys
import pathlib
import pytest
from fastapi.testclient import TestClient
import anyio

if not hasattr(anyio, "start_blocking_portal"):
    from anyio import from_thread

    def start_blocking_portal(*args, **kwargs):
        return from_thread.start_blocking_portal(*args, **kwargs)

    anyio.start_blocking_portal = start_blocking_portal


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("AUTH_MODE", "apikey")
    monkeypatch.setenv("API_KEYS", "testkey")
    pkg_path = pathlib.Path(__file__).resolve().parents[1]
    sys.path.append(str(pkg_path))
    from app.main import app
    from app.security import limiter
    return TestClient(app)
