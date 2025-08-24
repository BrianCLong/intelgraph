from datetime import datetime, timezone
from typing import Dict
import uuid

from .nlp.embedder import embed
from .events import emit

STOPWORDS = {"the", "a", "an", "of", "and", "to"}

_claims: Dict[str, dict] = {}


def normalize(text: str) -> str:
    tokens = [t.lower() for t in text.split() if t.lower() not in STOPWORDS]
    return " ".join(tokens)


def create_claim(text: str) -> dict:
    cid = str(uuid.uuid4())
    norm = normalize(text)
    emb = embed(norm)
    claim = {
        "id": cid,
        "text": text,
        "normalized": norm,
        "embedding": emb,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "evidence": [],
    }
    _claims[cid] = claim
    emit("prov.claim.registered", {"id": cid})
    return claim


def get_claim(cid: str) -> dict | None:
    return _claims.get(cid)
