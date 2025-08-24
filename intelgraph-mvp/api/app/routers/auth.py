from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

from ..auth.jwt import create_token

router = APIRouter()


class TokenRequest(BaseModel):
    sub: str
    roles: List[str] = []
    clearances: List[str] = []
    cases: List[str] = []


@router.post("/auth/token")
def issue_token(req: TokenRequest) -> dict:
    token = create_token(req.dict())
    return {"access_token": token, "token_type": "bearer"}
