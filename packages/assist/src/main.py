from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from uuid import uuid4
from intents import parse
from planner import make_plan, Plan
from tools import run_tool
from composer import compose
from safety import sanitize

app = FastAPI()

SESSIONS: dict[str, dict] = {}
MESSAGES: dict[str, list] = {}

class OpenSession(BaseModel):
  assistantId: str
  title: str | None = None
  classification: str = 'LOW'

class Session(BaseModel):
  id: str
  assistantId: str
  title: str | None
  classification: str

class ChatSend(BaseModel):
  sessionId: str
  text: str

class PlanRequest(BaseModel):
  sessionId: str
  text: str

@app.post('/session/open')
def session_open(body: OpenSession) -> Session:
  sid = str(uuid4())
  SESSIONS[sid] = body.model_dump()
  MESSAGES[sid] = []
  return Session(id=sid, **body.model_dump())

@app.post('/chat/send')
def chat_send(body: ChatSend):
  sanitize(body.text)
  plan = make_plan(body.text)
  if not plan:
    raise HTTPException(400, 'no-intent')
  data = []
  citations = []
  for step in plan.steps:
    out, cite = run_tool(step.tool, step.inputs)
    data.append(out)
    citations.append(cite)
    MESSAGES[body.sessionId].append({'role': 'TOOL', 'text': step.tool, 'citations': [cite]})
  answer = compose(data, citations)
  MESSAGES[body.sessionId].append({'role': 'ASSISTANT', 'text': answer['text'], 'citations': citations})
  return {'messages': MESSAGES[body.sessionId][-2:]}

@app.post('/plan/dryrun')
def plan_dryrun(body: PlanRequest):
  sanitize(body.text)
  plan = make_plan(body.text)
  if not plan:
    raise HTTPException(400, 'no-intent')
  return {'plan': plan}

@app.post('/plan/execute')
def plan_execute(plan: PlanRequest):
  sanitize(plan.text)
  p = make_plan(plan.text)
  if not p:
    raise HTTPException(400, 'no-intent')
  data = []
  citations = []
  for step in p.steps:
    out, cite = run_tool(step.tool, step.inputs)
    data.append(out)
    citations.append(cite)
  return {'outputs': data, 'citations': citations}
