from typing import Any, Dict, Iterable
from .base import Ingestor

class TwitterIngestor(Ingestor):
    def __init__(self, producer: Any, topic: str, api_client: Any):
        super().__init__(producer, topic)
        self.api_client = api_client

    def fetch(self) -> Iterable[Dict[str, Any]]:
        # Placeholder implementation: in real usage, integrate with Twitter API
        for tweet in getattr(self.api_client, 'sample_stream', lambda: [])():
            yield tweet

    def normalize(self, item: Dict[str, Any]) -> Dict[str, Any]:
        external_id = item.get("id_str")
        return {
            "id": external_id,
            "external_id": external_id,
            "platform": "twitter",
            "timestamp": item.get("created_at"),
            "text": item.get("text", ""),
            "metadata": {"user": item.get("user", {}).get("screen_name")},
        }
