import sys
from pathlib import Path

SERVICE_SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.append(str(SERVICE_SRC))

from main import QUARANTINE, evaluate_payload, quarantine_retry
from models import EvaluationRequest, Rule


def test_quarantine_replay():
    QUARANTINE.clear()
    rule = Rule(id="r1", field="name", type="required")
    req = EvaluationRequest(payload={}, rules=[rule])
    findings = evaluate_payload(req)
    assert findings
    assert QUARANTINE

    item_id = QUARANTINE[0].id
    res = quarantine_retry(item_id)
    assert res["status"] == "retried"
    assert not QUARANTINE
