_events: list[dict] = []


def emit(topic: str, payload: dict) -> None:
    """Record an event in-memory.

    Acts as a lightweight stand-in for Kafka emission so tests can
    introspect generated events without external dependencies.
    """
    _events.append({"topic": topic, "payload": payload})
