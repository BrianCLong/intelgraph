import io
import json
import zipfile
from typing import Dict

from prov import build_manifest


def build_package(doc: Dict) -> bytes:
  manifest = build_manifest(doc)
  mem = io.BytesIO()
  with zipfile.ZipFile(mem, "w") as zf:
    zf.writestr("original.txt", doc["text"])
    if doc.get("redacted"):
      zf.writestr("redacted.txt", doc["redacted"])
    zf.writestr("manifest.json", json.dumps(manifest))
  mem.seek(0)
  return mem.read()
