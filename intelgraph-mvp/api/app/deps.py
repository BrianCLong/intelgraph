from typing import List
from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel
from .auth.jwt import decode_token

class User(BaseModel):
    sub: str
    roles: List[str] = []
    clearances: List[str] = []
    cases: List[str] = []

def get_current_user(authorization: str = Header(...)) -> User:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid auth header")
    data = decode_token(token)
    return User(**data)

def get_tenant_case(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_case_id: str = Header(..., alias="X-Case-ID"),
    user: User = Depends(get_current_user),
):
    if x_case_id not in user.cases:
        raise HTTPException(status_code=403, detail="Case access denied")
    return {"tenant_id": x_tenant_id, "case_id": x_case_id, "user": user}

def require_clearance(clearance: str):
    def _dep(user: User = Depends(get_current_user)):
        if clearance not in user.clearances:
            raise HTTPException(status_code=403, detail="insufficient clearance")
        return user
    return _dep
