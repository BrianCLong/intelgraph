def build_narrative(snapshot: dict) -> str:
    """Build a timeline narrative from a graph snapshot."""
    events = sorted(snapshot.get("events", []), key=lambda e: e["time"])
    lines = [f"{e['time']}: {e['description']}" for e in events]
    return "\n".join(lines)
