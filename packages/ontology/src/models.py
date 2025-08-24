from __future__ import annotations

from pydantic import BaseModel, Field
import uuid


class OntologyIn(BaseModel):
  name: str
  version: str | None = None


class Ontology(BaseModel):
  id: str = Field(default_factory=lambda: str(uuid.uuid4()))
  name: str
  version: str = "0.1.0"


class ClassIn(BaseModel):
  ontology_id: str
  key: str
  label: str
  extends: str | None = None


class Class(BaseModel):
  ontology_id: str
  key: str
  label: str
  extends: str | None = None

