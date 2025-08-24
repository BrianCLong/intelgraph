from typing import List, Dict

from ingest import DOCUMENTS


def search(query: str) -> List[Dict]:
  hits: List[Dict] = []
  for doc in DOCUMENTS.values():
    if query.lower() in doc["text"].lower():
      snippet_index = doc["text"].lower().index(query.lower())
      snippet = doc["text"][snippet_index:snippet_index + 80]
      hits.append({"documentId": doc["id"], "snippet": snippet})
  return hits
