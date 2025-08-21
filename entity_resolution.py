from __future__ import annotations
from typing import List, Dict, Any
import numpy as np
import redis
from sentence_transformers import SentenceTransformer
import hdbscan
from prometheus_client import Counter, Gauge
from difflib import SequenceMatcher
import math


class EntityResolutionEngine:
    """Resolve similar entities into canonical IDs using embeddings and clustering."""

    def __init__(self, redis_client: redis.Redis, neo4j_client=None, model_name: str = "paraphrase-MiniLM-L6-v2"):
        self.redis = redis_client
        self.neo4j = neo4j_client
        self.model = SentenceTransformer(model_name)
        self.dedup_counter = Counter("deduplicated_entities_total", "Number of deduplicated entities")
        self.embedding_drift = Gauge("embedding_drift", "Embedding drift")
        self.feedback_delta = Gauge("feedback_loop_accuracy_delta", "Feedback loop accuracy delta")

    def _vectorize(self, entities: List[Dict[str, Any]]):
        texts = [self._combine(e) for e in entities]
        return np.array(self.model.encode(texts))

    def _combine(self, entity: Dict[str, Any]) -> str:
        metadata = " ".join(f"{k}:{v}" for k, v in entity.get("metadata", {}).items())
        return f"{entity['name']} {metadata}".strip()

    def resolve(self, entities: List[Dict[str, Any]]) -> Dict[str, str]:
        embeddings = self._vectorize(entities)
        clusterer = hdbscan.HDBSCAN(min_cluster_size=1)
        labels = clusterer.fit_predict(embeddings)
        mapping: Dict[str, str] = {}
        for entity, label in zip(entities, labels):
            canonical_id = f"canonical_{label}" if label != -1 else entity["id"]
            mapping[entity["id"]] = canonical_id
            self.redis.set(entity["id"], canonical_id)
            if self.neo4j:
                self.neo4j.create_or_update_entity("Entity", {"canonical_id": canonical_id, "name": entity["name"]})
        self.dedup_counter.inc(len(set(mapping.values())))
        return mapping


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance between two points in kilometers."""
    radius = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def explain(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    """Return feature scores and a final weighted score for two entities."""
    weights = {
        "email_match": 0.4,
        "phone_match": 0.3,
        "name_dob_similarity": 0.2,
        "geo_proximity": 0.1,
    }
    features: Dict[str, float] = {}
    features["email_match"] = 1.0 if a.get("email") and a.get("email") == b.get("email") else 0.0
    features["phone_match"] = 1.0 if a.get("phone") and a.get("phone") == b.get("phone") else 0.0
    name_score = SequenceMatcher(None, a.get("name", ""), b.get("name", "")).ratio()
    dob_score = 1.0 if a.get("dob") and a.get("dob") == b.get("dob") else 0.0
    features["name_dob_similarity"] = (name_score + dob_score) / 2
    if all(k in a for k in ("lat", "lon")) and all(k in b for k in ("lat", "lon")):
        dist = _haversine(a["lat"], a["lon"], b["lat"], b["lon"])
        features["geo_proximity"] = max(0.0, 1 - min(dist / 200.0, 1.0))
    else:
        features["geo_proximity"] = 0.0
    score = sum(features[k] * weights[k] for k in weights)
    return {"features": features, "score": score}
