from services.copilot.hypothesis_gen.hypothesis import generate_hypotheses


def test_generate_hypotheses_structure():
    result = generate_hypotheses(["obs"])
    assert "hypotheses" in result
    assert "missing_evidence" in result
