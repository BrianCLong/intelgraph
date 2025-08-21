"""Early-warning ensemble scoring for deepfake influence detection.

Implements `score_alert` for combining multi-model signals with provenance
and policy gating. This is a minimal skeleton aligned with committee
recommendations and prioritises traceability over raw prediction.
"""
from typing import Dict, Any


def score_alert(evidence: Dict[str, Any], models: Any, policy: Any) -> Dict[str, Any]:
    """Aggregate model scores and attach provenance and policy context.

    Parameters
    ----------
    evidence: Dict[str, Any]
        Evidence bundle containing transcript, media bytes, metadata and
        provenance chain.
    models: Any
        Container exposing ``text_clf.predict_proba``, ``av_forgery.detect``
        and ``meta_anom.score`` methods.
    policy: Any
        Object with ``reasoner`` for evaluating export governance.

    Returns
    -------
    Dict[str, Any]
        Alert payload with risk score, disagreement metric and explanations.
    """
    text_sig = models.text_clf.predict_proba(evidence["transcript"])
    av_sig = models.av_forgery.detect(evidence["media_bytes"])
    meta_sig = models.meta_anom.score(evidence["metadata"])

    consensus = (text_sig["score"] + av_sig["score"] + meta_sig["score"]) / 3
    disagree = max(text_sig["score"], av_sig["score"], meta_sig["score"]) - min(
        text_sig["score"], av_sig["score"], meta_sig["score"]
    )

    return {
        "risk_score": round(consensus * (1 + disagree), 3),
        "disagreement": round(disagree, 3),
        "provenance": evidence.get("provenance_chain", []),
        "policy_gate": policy.reasoner(evidence),
        "explain": {
            "text": text_sig.get("explain"),
            "av": av_sig.get("explain"),
            "meta": meta_sig.get("explain"),
        },
    }
