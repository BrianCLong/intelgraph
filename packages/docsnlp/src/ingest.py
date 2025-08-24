import hashlib
import io
from typing import Dict

from fastapi import UploadFile

DOCUMENTS: Dict[str, Dict] = {}


def save_upload(file: UploadFile) -> str:
  data = file.file.read()
  sha256 = hashlib.sha256(data).hexdigest()
  doc_id = sha256[:12]
  DOCUMENTS[doc_id] = {
    "id": doc_id,
    "title": file.filename or doc_id,
    "text": data.decode("utf-8", errors="ignore"),
    "entities": [],
    "redacted": None,
  }
  return doc_id
