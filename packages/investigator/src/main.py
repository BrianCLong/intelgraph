from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()

class InvestigationIn(BaseModel):
  title: str
  sensitivity: str

class Investigation(InvestigationIn):
  id: int
  status: str = "OPEN"
  createdAt: str

investigations: List[Investigation] = []

@app.post("/investigation/create", response_model=Investigation)
def create_investigation(data: InvestigationIn):
  inv = Investigation(
    id=len(investigations)+1,
    title=data.title,
    sensitivity=data.sensitivity,
    createdAt=datetime.utcnow().isoformat()+"Z"
  )
  investigations.append(inv)
  return inv

@app.get("/health")
def health():
  return {"status": "ok"}

from datetime import datetime
