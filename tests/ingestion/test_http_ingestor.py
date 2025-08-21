from unittest.mock import Mock, patch
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ingestion.ingestors.http import HTTPIngestor


def test_http_ingestor_runs():
    producer = Mock()
    urls = ["http://example.com/data"]
    sample = [{"id": "1", "text": "hello", "timestamp": "2024-01-01"}]
    with patch("ingestion.ingestors.http.requests.get") as mock_get:
        mock_get.return_value.json.return_value = sample
        ingestor = HTTPIngestor(producer, "topic", urls)
        ingestor.run()
    producer.send.assert_called_once()
    sent = producer.send.call_args.kwargs["value"]
    assert sent["text"] == "hello"
    assert sent["platform"] == "http"
