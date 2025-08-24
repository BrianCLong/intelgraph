from uuid import uuid4

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="CaseOps")


class Case(BaseModel):
    id: str
    title: str
    description: str | None = None


class CreateCaseRequest(BaseModel):
    title: str
    description: str | None = None


_cases: list[Case] = []


@app.post("/case/create", response_model=Case)
def create_case(req: CreateCaseRequest) -> Case:
    case = Case(id=str(uuid4()), **req.dict())
    _cases.append(case)
    return case


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
