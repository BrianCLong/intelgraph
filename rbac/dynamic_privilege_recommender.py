from dataclasses import dataclass
from typing import Dict, Tuple

import numpy as np

from .role_inference_engine import RoleInferenceEngine, RoleVector


@dataclass
class RecommendationResult:
    tier: int
    flagged: bool
    distance: float


class DynamicPrivilegeRecommender:
    """Predict RBAC tiers and flag deviations."""

    def __init__(self, engine: RoleInferenceEngine):
        self.engine = engine

    def recommend(self, user_id: str, feature_vector: np.ndarray) -> RecommendationResult:
        tier = self.engine.predict_rbac_tier(feature_vector)
        distance, flagged = self.engine.deviation_from_centroid(feature_vector)
        return RecommendationResult(tier=tier, flagged=flagged, distance=distance)

    def store_role_vector(self, user_id: str, role: RoleVector, key: bytes, source: str, flagged: bool) -> str:
        token = role.encrypt(key)
        self.engine.tag_roles_in_graph(user_id, role, source, flagged)
        return token
