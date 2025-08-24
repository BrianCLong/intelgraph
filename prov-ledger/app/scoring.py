from datetime import datetime, timezone
from urllib.parse import urlparse

from .evidence import get_evidence
from .matching import candidate_similarity


def independence(evidence_ids):
    domains = {urlparse(get_evidence(eid)["url"]).netloc for eid in evidence_ids if get_evidence(eid).get("url")}
    return min(1.0, len(domains) / max(1, len(evidence_ids)))


def recency(evidence_ids):
    now = datetime.now(timezone.utc)
    dates = [datetime.fromisoformat(get_evidence(eid)["created_at"]) for eid in evidence_ids]
    if not dates:
        return 0.0
    days = min((now - max(dates)).days, 365)
    return max(0.0, 1 - days / 365)


def consistency(evidence_ids):
    return 1.0 if len(evidence_ids) > 1 else 0.5


def corroborate(claim_id: str, evidence_ids):
    sim = sum(candidate_similarity(claim_id, eid) for eid in evidence_ids) / max(len(evidence_ids), 1)
    indep = independence(evidence_ids)
    rec = recency(evidence_ids)
    cons = consistency(evidence_ids)
    score = sim * 0.5 + indep * 0.2 + rec * 0.1 + cons * 0.2
    breakdown = {"similarity": sim, "independence": indep, "recency": rec, "consistency": cons}
    return score, breakdown
