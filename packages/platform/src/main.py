from fastapi import FastAPI, HTTPException

from modules.tenants import TenantCreate, TenantService
from modules.auth import AuthService, UserRegister, UserLogin, TokenRefresh

app = FastAPI()
auth_service = AuthService()
tenant_service = TenantService()

@app.post("/tenant/create")
def create_tenant(payload: TenantCreate):
    return tenant_service.create(payload)

@app.get("/tenant/list")
def list_tenants():
    return list(tenant_service.tenants.values())

@app.post("/auth/register")
def register(payload: UserRegister):
    if not tenant_service.get(payload.tenant_id):
        raise HTTPException(status_code=404, detail="tenant not found")
    return auth_service.register(payload)

@app.post("/auth/login")
def login(payload: UserLogin):
    try:
        return auth_service.login(payload)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

@app.post("/auth/refresh")
def refresh(payload: TokenRefresh):
    try:
        return auth_service.refresh(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

@app.post("/auth/logout/{session_id}")
def logout(session_id: str):
    auth_service.logout(session_id)
    return {"ok": True}
