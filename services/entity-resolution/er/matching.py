from difflib import SequenceMatcher
from typing import List, Tuple
from .schemas import EntityIn
from .models import AttributeEvidence, Scorecard, Entity
from .database import SessionLocal

EMAIL_WEIGHT = 0.7
NAME_WEIGHT = 0.3


def compute_features(incoming: EntityIn, existing: Entity) -> List[Tuple[str, float, float]]:
    features = []
    email_score = 1.0 if incoming.email and existing.email and incoming.email.lower() == existing.email.lower() else 0.0
    features.append(("email_exact", EMAIL_WEIGHT, email_score))
    name_score = 0.0
    if incoming.name and existing.name:
        name_score = SequenceMatcher(None, incoming.name.lower(), existing.name.lower()).ratio()
    features.append(("name_similarity", NAME_WEIGHT, name_score))
    return features


def total_score(features: List[Tuple[str, float, float]]) -> float:
    return sum(w * s for _, w, s in features)


def persist_scorecard(pair_id: str, features: List[Tuple[str, float, float]], session: SessionLocal) -> None:
    sc = Scorecard(pair_id=pair_id, total_score=total_score(features))
    session.add(sc)
    session.flush()
    for attr, weight, score in features:
        session.add(AttributeEvidence(pair_id=pair_id, attribute=attr, weight=weight, score=score))
    session.commit()
