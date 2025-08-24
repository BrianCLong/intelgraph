from hypothesis import given, strategies as st

import sys
from pathlib import Path

SERVICE_SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.append(str(SERVICE_SRC))

from models import EvaluationRequest, Rule
from rule_engine import evaluate


def test_required_rule_triggers():
    rule = Rule(id="1", field="name", type="required")
    req = EvaluationRequest(payload={}, rules=[rule])
    findings = evaluate(req)
    assert findings[0].field == "name"


@given(st.integers(min_value=0, max_value=100))
def test_range_rule(value):
    rule = Rule(id="2", field="age", type="range", params={"min": 0, "max": 10})
    req = EvaluationRequest(payload={"age": value}, rules=[rule])
    findings = evaluate(req)
    assert bool(findings) == (value > 10)
