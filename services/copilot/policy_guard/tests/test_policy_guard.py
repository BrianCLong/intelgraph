from services.copilot.policy_guard.policy_guard import evaluate_policy


def test_policy_guard_denies_action():
    result = evaluate_policy("drop_database")
    assert not result["allowed"]
    assert result["appeal"] == "/appeals"
