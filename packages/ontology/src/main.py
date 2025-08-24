from fastapi import FastAPI, HTTPException
from models import OntologyIn, Ontology, ClassIn, Class
from typing import Dict, List

app = FastAPI(title="Ontology Service")

# In-memory stores
ontologies: Dict[str, Ontology] = {}
classes: Dict[str, List[Class]] = {}


@app.post("/ontology/create", response_model=Ontology)
def create_ontology(payload: OntologyIn) -> Ontology:
  ontology = Ontology(name=payload.name, version=payload.version or "0.1.0")
  ontologies[ontology.id] = ontology
  classes[ontology.id] = []
  return ontology


@app.post("/class/upsert", response_model=Class)
def upsert_class(payload: ClassIn) -> Class:
  if payload.ontology_id not in ontologies:
    raise HTTPException(status_code=404, detail="ontology not found")
  cls = Class(**payload.model_dump())
  existing = [c for c in classes[payload.ontology_id] if c.key == payload.key]
  if existing:
    classes[payload.ontology_id] = [c for c in classes[payload.ontology_id] if c.key != payload.key]
  classes[payload.ontology_id].append(cls)
  return cls


@app.get("/ontology/{oid}/classes", response_model=list[Class])
def list_classes(oid: str) -> List[Class]:
  if oid not in classes:
    raise HTTPException(status_code=404, detail="ontology not found")
  return classes[oid]


@app.get("/health")
def health() -> dict:
  return {"status": "ok"}
