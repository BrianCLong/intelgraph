from services.copilot.narratives.narrative_builder import build_narrative


def test_narrative_builder_orders_events():
    snapshot = {
        "events": [{"time": 2, "description": "second"}, {"time": 1, "description": "first"}]
    }
    result = build_narrative(snapshot)
    assert result.splitlines()[0].endswith("first")
