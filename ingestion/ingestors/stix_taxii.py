from typing import Any, Dict, Iterable, Optional

from .base import Ingestor

try:
    from taxii2client.v21 import Collection
except ImportError:  # pragma: no cover - dependency optional
    Collection = None  # type: ignore


class STIXTAXIIIngestor(Ingestor):
    """Ingest STIX objects from a TAXII 2.1 collection."""

    def __init__(self, producer: Any, topic: str, collection_url: str, headers: Optional[Dict[str, str]] = None):
        super().__init__(producer, topic)
        self.collection_url = collection_url
        self.headers = headers or {}

    def fetch(self) -> Iterable[Dict[str, Any]]:
        """Fetch STIX objects from the TAXII collection."""
        if Collection is None:
            return []
        collection = Collection(self.collection_url, headers=self.headers)
        bundles = collection.get_objects()
        objects = bundles.get("objects", []) if isinstance(bundles, dict) else []
        for obj in objects:
            yield obj

    def normalize(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a STIX object into a canonical format."""
        return {
            "id": item.get("id"),
            "platform": "stix-taxii",
            "type": item.get("type"),
            "data": item,
        }
