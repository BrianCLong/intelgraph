import base64
import json
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Tuple

import numpy as np
from sklearn.cluster import KMeans

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except Exception:  # pragma: no cover - library might not be installed
    AESGCM = None

try:  # XGBoost is optional for runtime environments
    import xgboost as xgb
except Exception:  # pragma: no cover
    xgb = None

from intelgraph_postgres_client import PostgresClient
from intelgraph_neo4j_client import Neo4jClient


@dataclass
class RoleVector:
    """Soft role representation."""

    vector: Dict[str, float]

    def encrypt(self, key: bytes) -> str:
        """Encrypt the role vector using AES-GCM."""
        if AESGCM is None:
            raise RuntimeError("cryptography library not available")
        aesgcm = AESGCM(key)
        nonce = AESGCM.generate_key(bit_length=96)  # type: ignore[attr-defined]
        data = json.dumps(self.vector).encode("utf-8")
        cipher = aesgcm.encrypt(nonce, data, None)
        return base64.b64encode(nonce + cipher).decode("utf-8")

    @staticmethod
    def decrypt(token: str, key: bytes) -> "RoleVector":
        if AESGCM is None:
            raise RuntimeError("cryptography library not available")
        raw = base64.b64decode(token.encode("utf-8"))
        nonce, cipher = raw[:12], raw[12:]
        aesgcm = AESGCM(key)
        data = aesgcm.decrypt(nonce, cipher, None)
        return RoleVector(json.loads(data.decode("utf-8")))


class RoleInferenceEngine:
    """Infer roles from user behaviour in Postgres/Neo4j audit trails."""

    def __init__(self, pg_client: PostgresClient, neo_client: Neo4jClient):
        self.pg = pg_client
        self.neo = neo_client
        self.cluster_model: KMeans | None = None
        self.std_dev: Dict[int, float] = {}
        self.role_map: Dict[int, Dict[str, float]] = {}
        self.xgb_model: xgb.Booster | None = None  # type: ignore[assignment]

    # ------------------------------------------------------------------
    # Data ingestion
    def fetch_session_activity(self) -> List[Dict]:
        """Fetch audit and session data from Postgres."""
        query = (
            "SELECT user_id, node_type, action, timestamp, tool "
            "FROM audit_trail WHERE action IN ('VIEWED','MODIFIED','QUERIED')"
        )
        return self.pg.fetch_all(query)

    # ------------------------------------------------------------------
    # Feature engineering
    @staticmethod
    def _time_bucket(ts: datetime) -> int:
        return ts.hour // 6  # four buckets across the day

    def build_features(self, records: List[Dict]) -> Dict[str, np.ndarray]:
        """Aggregate behaviour into feature vectors per user."""
        features: Dict[str, List[float]] = {}
        for r in records:
            user = r["user_id"]
            feats = features.setdefault(user, [0] * 20)
            node_idx = hash(r["node_type"]) % 5
            time_idx = 5 + self._time_bucket(r["timestamp"])
            query_idx = 9 + hash(r.get("query_shape", "")) % 5
            tool_idx = 14 + hash(r.get("tool", "")) % 5
            feats[node_idx] += 1
            feats[time_idx] += 1
            feats[query_idx] += 1
            feats[tool_idx] += 1
        return {u: np.array(v) for u, v in features.items()}

    # ------------------------------------------------------------------
    # Clustering and role assignment
    def cluster_behaviours(self, user_features: Dict[str, np.ndarray], n_clusters: int = 3) -> None:
        matrix = np.vstack(list(user_features.values()))
        self.cluster_model = KMeans(n_clusters=n_clusters, random_state=42)
        labels = self.cluster_model.fit_predict(matrix)
        for idx, (user, vec) in enumerate(user_features.items()):
            center = self.cluster_model.cluster_centers_[labels[idx]]
            dist = np.linalg.norm(vec - center)
            self.std_dev[labels[idx]] = float(np.std(matrix[labels == labels[idx]], axis=0).mean())
            self.role_map[labels[idx]] = {f"Role{i}": float(c) for i, c in enumerate(center)}

    def infer_roles(self, user_features: Dict[str, np.ndarray]) -> Dict[str, RoleVector]:
        if self.cluster_model is None:
            raise RuntimeError("cluster_behaviours must be called first")
        matrix = np.vstack(list(user_features.values()))
        labels = self.cluster_model.predict(matrix)
        roles: Dict[str, RoleVector] = {}
        for idx, user in enumerate(user_features.keys()):
            center = self.cluster_model.cluster_centers_[labels[idx]]
            vec = user_features[user]
            diff = np.abs(center - vec)
            soft = diff / diff.sum() if diff.sum() else np.ones_like(diff)
            roles[user] = RoleVector({f"Role{i}": float(v) for i, v in enumerate(soft)})
        return roles

    # ------------------------------------------------------------------
    # Dynamic privilege recommendation
    def load_xgb_model(self, model_path: str) -> None:
        if xgb is None:
            raise RuntimeError("xgboost not available")
        self.xgb_model = xgb.Booster()
        self.xgb_model.load_model(model_path)

    def predict_rbac_tier(self, feature_vector: np.ndarray) -> int:
        if self.xgb_model is None:
            raise RuntimeError("xgb model not loaded")
        dmat = xgb.DMatrix(feature_vector.reshape(1, -1))
        pred = self.xgb_model.predict(dmat)
        return int(np.argmax(pred))

    def deviation_from_centroid(self, user_vector: np.ndarray) -> Tuple[float, bool]:
        if self.cluster_model is None:
            raise RuntimeError("cluster_behaviours must be called first")
        label = int(self.cluster_model.predict([user_vector])[0])
        center = self.cluster_model.cluster_centers_[label]
        dist = float(np.linalg.norm(user_vector - center))
        flagged = dist > 2 * self.std_dev.get(label, 1.0)
        return dist, flagged

    # ------------------------------------------------------------------
    # Graph tagging
    def tag_roles_in_graph(self, user_id: str, role: RoleVector, source: str, flagged: bool) -> None:
        session = self.neo.session()
        try:
            session.run(
                "MERGE (u:User {id:$id})\n"
                "SET u.role_vector = $vector\n"
                "WITH u\n"
                "MERGE (r:Role {name:$role})\n"
                "MERGE (u)-[:HAS_IMPLICIT_ROLE]->(r)\n"
                "MERGE (u)-[:INFERRED_FROM {source:$source}]->(r)\n"
                + (
                    "MERGE (u)-[:FLAGGED_AS_PRIV_ESCALATION]->(r)\n"
                    if flagged
                    else ""
                ),
                {
                    "id": user_id,
                    "vector": json.dumps(role.vector),
                    "role": max(role.vector, key=role.vector.get),
                    "source": source,
                },
            )
        finally:
            session.close()


# ----------------------------------------------------------------------
# Access simulation helper

def simulate_access(role_vector: Dict[str, float], action: str) -> Dict[str, object]:
    """Simple rule-based access simulation for API."""
    required_role = {
        "delete-user": "Admin",
        "view-report": "Analyst",
    }.get(action, "Analyst")
    score = role_vector.get(required_role, 0.0)
    granted = score >= 0.5
    rationale = f"requires {required_role} with score>=0.5"
    return {
        "granted": granted,
        "rationale": rationale,
        "confidence": float(score),
        "overrideHistory": [],
    }


if __name__ == "__main__":  # pragma: no cover - manual execution
    pg = PostgresClient()
    neo = Neo4jClient()
    engine = RoleInferenceEngine(pg, neo)
    records = engine.fetch_session_activity()
    feats = engine.build_features(records)
    engine.cluster_behaviours(feats)
    roles = engine.infer_roles(feats)
    for user, vector in roles.items():
        dist, flagged = engine.deviation_from_centroid(feats[user])
        engine.tag_roles_in_graph(user, vector, "batch", flagged)
        print(user, vector.vector, dist, flagged)
