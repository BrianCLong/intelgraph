from datetime import datetime
from typing import Dict, List, Optional
import uuid
from io import BytesIO

from .nlp.embedder import embed
from .hashing import sha256_digest

STOPWORDS = {"the", "a", "an", "of", "and", "to"}

_claims: Dict[str, dict] = {}


def normalize(text: str) -> str:
    tokens = [t.lower() for t in text.split() if t.lower() not in STOPWORDS]
    return " ".join(tokens)


def create_claim(
    text: str,
    source_uri: Optional[str] = None,
    connector: Optional[str] = None,
    transforms: Optional[List[str]] = None,
    actor: str = "system",
) -> dict:
    """Create a claim with provenance metadata."""
    cid = str(uuid.uuid4())
    norm = normalize(text)
    emb = embed(norm)
    payload_hash, _ = sha256_digest(BytesIO(text.encode("utf-8")))
    claim = {
        "id": cid,
        "text": text,
        "normalized": norm,
        "embedding": emb,
        "created_at": datetime.utcnow().isoformat(),
        "source_uri": source_uri,
        "connector": connector,
        "transforms": transforms or [],
        "payload_hash": payload_hash,
        "actor": actor,
        "evidence": [],
    }
    _claims[cid] = claim
    return claim


def get_claim(cid: str) -> dict | None:
    return _claims.get(cid)
