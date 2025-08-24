import hashlib
from typing import Dict


def build_manifest(doc: Dict) -> Dict:
  sha256 = hashlib.sha256(doc["text"].encode("utf-8")).hexdigest()
  return {"documentId": doc["id"], "sha256": sha256}
