import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))

from analysis.early_warning import score_alert


class _StubText:
    def predict_proba(self, _text):
        return {"score": 0.6, "explain": "text"}


class _StubAV:
    def detect(self, _bytes):
        return {"score": 0.3, "explain": "av"}


class _StubMeta:
    def score(self, _metadata):
        return {"score": 0.9, "explain": "meta"}


class _Models:
    text_clf = _StubText()
    av_forgery = _StubAV()
    meta_anom = _StubMeta()


class _Policy:
    def reasoner(self, evidence):
        return {"status": "allow", "source": evidence.get("provenance_chain", [])}


def test_score_alert_combines_models():
    evidence = {
        "transcript": "hello",
        "media_bytes": b"",
        "metadata": {},
        "provenance_chain": ["src"],
    }
    alert = score_alert(evidence, _Models(), _Policy())
    assert alert["risk_score"] == 0.96
    assert alert["disagreement"] == 0.6
    assert alert["provenance"] == ["src"]
    assert alert["policy_gate"]["status"] == "allow"
