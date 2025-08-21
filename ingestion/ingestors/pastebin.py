from typing import Any, Dict, Iterable
from .base import Ingestor

class PastebinIngestor(Ingestor):
    def __init__(self, producer: Any, topic: str, api_client: Any):
        super().__init__(producer, topic)
        self.api_client = api_client

    def fetch(self) -> Iterable[Dict[str, Any]]:
        for paste in getattr(self.api_client, 'recent_pastes', lambda: [])():
            yield paste

    def normalize(self, item: Dict[str, Any]) -> Dict[str, Any]:
        external_id = item.get("key")
        return {
            "id": external_id,
            "external_id": external_id,
            "platform": "pastebin",
            "timestamp": item.get("date"),
            "text": item.get("content", ""),
            "metadata": {"title": item.get("title")},
        }
