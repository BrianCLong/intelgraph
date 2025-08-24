from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import uuid

app = FastAPI()
_jobs: dict[str, dict] = {}

class IngestResponse(BaseModel):
  job_id: str

class Record(BaseModel):
  name: str
  ssn: str | None = None
  license: str | None = None

def detect_pii(record: Record) -> bool:
  return record.ssn is not None

@app.post('/ingest', response_model=IngestResponse)
async def ingest(file: UploadFile = File(...)):
  data = await file.read()
  job_id = str(uuid.uuid4())
  _jobs[job_id] = {'status': 'done', 'size': len(data)}
  return IngestResponse(job_id=job_id)

@app.post('/ingest-json')
async def ingest_json(record: Record):
  return {'pii': detect_pii(record), 'license': record.license or 'MIT'}

@app.get('/jobs/{job_id}')
async def job_status(job_id: str):
  return _jobs.get(job_id, {'status': 'unknown'})
