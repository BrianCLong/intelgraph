from ingestion.ingestors.stix_taxii import STIXTAXIIIngestor


class DummyCollection:
    def __init__(self, url, headers=None):
        self.url = url
        self.headers = headers or {}

    def get_objects(self):
        return {
            "objects": [
                {
                    "id": "indicator--00000000-0000-4000-8000-000000000001",
                    "type": "indicator",
                }
            ]
        }


def test_fetch_and_normalize(monkeypatch):
    monkeypatch.setattr(
        "ingestion.ingestors.stix_taxii.Collection", DummyCollection
    )
    ingestor = STIXTAXIIIngestor(None, "topic", "http://example.com/collection")
    items = list(ingestor.fetch())
    assert items[0]["type"] == "indicator"
    normalized = ingestor.normalize(items[0])
    assert normalized["id"].startswith("indicator--")
    assert normalized["platform"] == "stix-taxii"
