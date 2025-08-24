from fastapi import FastAPI, UploadFile, File
from . import hashing, image_ela, pdf_inspect
from pydantic import BaseModel

app = FastAPI()

class IngestResponse(BaseModel):
  id: str
  sha256: str

@app.post('/ingest', response_model=IngestResponse)
async def ingest(file: UploadFile = File(...)):
  data = await file.read()
  sha = hashing.sha256_bytes(data)
  return IngestResponse(id=file.filename, sha256=sha)

class AnalyzeRequest(BaseModel):
  type: str

@app.post('/analyze/run')
async def analyze(req: AnalyzeRequest, file: UploadFile = File(...)):
  data = await file.read()
  if req.type == 'ELA':
    img = image_ela.ela_image(data)
    return {'result': 'ok', 'size': len(img)}
  if req.type == 'PDF':
    info = pdf_inspect.inspect(data)
    return info
  return {'error': 'unknown type'}

@app.get('/health')
async def health():
  return {'status': 'ok'}
