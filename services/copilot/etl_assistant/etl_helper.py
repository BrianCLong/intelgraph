def suggest_mappings(schema: dict, rows: list[dict]) -> list:
    """Suggest direct field mappings with justification."""
    if not rows:
        return []
    suggestions = []
    sample = rows[0]
    for field in schema:
        if field in sample:
            suggestions.append({"field": field, "mapping": field, "justification": "direct match"})
    return suggestions
