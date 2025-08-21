class OfflineModelRunner:
    """Deterministic offline model runner for tests."""

    def run(self, prompt: str) -> str:
        return f"offline-response:{hash(prompt) % 1000}"
