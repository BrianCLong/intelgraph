from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List
from datetime import datetime

app = FastAPI(title="GA-CaseOps Case Service")

class CaseCreate(BaseModel):
  title: str
  description: str | None = None
  sensitivity: str = Field(default="LOW")

class Case(CaseCreate):
  id: int
  created_at: datetime

class Participant(BaseModel):
  id: int
  case_id: int
  user_id: str
  role: str
  added_at: datetime

cases: Dict[int, Case] = {}
participants: Dict[int, Participant] = {}
case_id_seq = 1
participant_id_seq = 1

@app.post("/cases", response_model=Case)
def create_case(payload: CaseCreate) -> Case:
  global case_id_seq
  case = Case(id=case_id_seq, created_at=datetime.utcnow(), **payload.dict())
  cases[case_id_seq] = case
  case_id_seq += 1
  return case

@app.get("/cases", response_model=List[Case])
def list_cases() -> List[Case]:
  return list(cases.values())

class ParticipantCreate(BaseModel):
  case_id: int
  user_id: str
  role: str

@app.post("/cases/{case_id}/participants", response_model=Participant)
def add_participant(case_id: int, payload: ParticipantCreate) -> Participant:
  if case_id not in cases:
    raise HTTPException(status_code=404, detail="case not found")
  global participant_id_seq
  part = Participant(
    id=participant_id_seq,
    case_id=case_id,
    user_id=payload.user_id,
    role=payload.role,
    added_at=datetime.utcnow(),
  )
  participants[participant_id_seq] = part
  participant_id_seq += 1
  return part

