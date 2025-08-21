from services.copilot.etl_assistant.etl_helper import suggest_mappings


def test_suggest_mappings_returns_justification():
    schema = {"name": "text"}
    rows = [{"name": "Alice"}]
    result = suggest_mappings(schema, rows)
    assert result[0]["justification"] == "direct match"
