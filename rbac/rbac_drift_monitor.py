"""Nightly drift monitoring for RBAC roles."""
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict

from .role_inference_engine import RoleInferenceEngine
from .dynamic_privilege_recommender import DynamicPrivilegeRecommender
from intelgraph_postgres_client import PostgresClient
from intelgraph_neo4j_client import Neo4jClient


REPORT_DIR = Path(__file__).resolve().parent / "reports"


def run_monitor():  # pragma: no cover - CLI utility
    pg = PostgresClient()
    neo = Neo4jClient()
    engine = RoleInferenceEngine(pg, neo)
    recommender = DynamicPrivilegeRecommender(engine)
    records = engine.fetch_session_activity()
    feats = engine.build_features(records)
    engine.cluster_behaviours(feats)
    roles = engine.infer_roles(feats)

    flagged_users: Dict[str, float] = {}
    for user, vec in feats.items():
        _, flagged = engine.deviation_from_centroid(vec)
        if flagged:
            flagged_users[user] = float(_)

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"drift_{datetime.utcnow().date()}.csv"
    with report_path.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["user_id", "distance"])
        for user, dist in flagged_users.items():
            writer.writerow([user, dist])

    # Placeholder for graph report generation
    print(f"Generated drift report: {report_path}")


if __name__ == "__main__":  # pragma: no cover
    run_monitor()
