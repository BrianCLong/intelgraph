from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict

from ingest import save_upload, DOCUMENTS
from ner_pii import extract_entities
from chunk_search import search as run_search
from redact import apply_redaction
from exports import build_package

app = FastAPI(title="DocsNLP")


class UploadResponse(BaseModel):
  documentId: str


class Entity(BaseModel):
  type: str
  text: str
  start: int
  end: int


class SearchHit(BaseModel):
  documentId: str
  snippet: str


class SearchResponse(BaseModel):
  hits: List[SearchHit]


@app.post("/doc/upload", response_model=UploadResponse)
async def doc_upload(file: UploadFile = File(...)):
  doc_id = save_upload(file)
  return {"documentId": doc_id}


@app.get("/doc/list")
async def doc_list():
  return [{"id": d["id"], "title": d["title"]} for d in DOCUMENTS.values()]


class NERRequest(BaseModel):
  documentId: str


@app.post("/ner/run")
async def ner_run(req: NERRequest):
  doc = DOCUMENTS[req.documentId]
  entities = extract_entities(doc["text"])
  doc["entities"] = entities
  return {"entities": entities}


class SearchRequest(BaseModel):
  q: str


@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest):
  hits = run_search(req.q)
  return {"hits": hits}


class RedactRequest(BaseModel):
  documentId: str


@app.post("/redact/apply")
async def redact(req: RedactRequest):
  doc = DOCUMENTS[req.documentId]
  redacted, count = apply_redaction(doc["text"])
  doc["redacted"] = redacted
  return {"count": count}


class PackageRequest(BaseModel):
  documentId: str


@app.post("/package/export")
async def package_export(req: PackageRequest):
  doc = DOCUMENTS[req.documentId]
  data = build_package(doc)
  return {"size": len(data)}


@app.get("/health")
async def health():
  return {"status": "ok"}
