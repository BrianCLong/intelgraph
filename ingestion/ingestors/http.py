from __future__ import annotations
from typing import Any, Dict, Iterable, List
import requests
from .base import Ingestor


class HTTPIngestor(Ingestor):
    """Fetch JSON items from HTTP endpoints."""

    def __init__(self, producer: Any, topic: str, urls: Iterable[str]):
        super().__init__(producer, topic)
        self.urls: List[str] = list(urls)

    def fetch(self) -> Iterable[Dict[str, Any]]:
        for url in self.urls:
            resp = requests.get(url, timeout=10)
            data = resp.json()
            if isinstance(data, list):
                for item in data:
                    yield item
            else:
                yield data

    def normalize(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": item.get("id") or hash(str(item)),
            "platform": "http",
            "timestamp": item.get("timestamp"),
            "text": item.get("text", ""),
            "metadata": {"source": item.get("source")},
        }
