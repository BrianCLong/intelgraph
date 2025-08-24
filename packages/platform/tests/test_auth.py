import sys
from pathlib import Path
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "src"))

from main import app, auth_service, tenant_service  # noqa: E402
from modules.tenants import TenantCreate  # noqa: E402

client = TestClient(app)


def setup_module(_: object) -> None:
    tenant = tenant_service.create(TenantCreate(name="Acme", slug="acme"))
    global tenant_id
    tenant_id = tenant.id


def test_register_login_refresh_flow() -> None:
    # register
    res = client.post("/auth/register", json={
        "tenant_id": tenant_id,
        "email": "a@example.com",
        "password": "secret",
        "name": "Alice"
    })
    assert res.status_code == 200

    # login
    res = client.post("/auth/login", json={
        "tenant_id": tenant_id,
        "email": "a@example.com",
        "password": "secret"
    })
    assert res.status_code == 200
    tokens = res.json()

    # refresh
    res2 = client.post("/auth/refresh", json={"refresh_token": tokens["refresh"]})
    assert res2.status_code == 200
    new_tokens = res2.json()

    # reuse old refresh should fail
    res3 = client.post("/auth/refresh", json={"refresh_token": tokens["refresh"]})
    assert res3.status_code == 401

    assert "access" in new_tokens and "refresh" in new_tokens
