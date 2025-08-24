import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))

from ingestion.streaming_worker import StreamingWorker


def test_golden_io_and_redaction(tmp_path):
    mapping = Path("contracts/mapping/person.json")
    redaction = tmp_path / "redactions.json"
    worker = StreamingWorker(mapping, redaction)
    input_file = Path("tests/fixtures/streaming_ingest/sample.csv")
    expected_file = Path("tests/fixtures/streaming_ingest/sample_expected.jsonl")

    events = worker.process_file(input_file)
    assert len(events) == 1
    event = events[0]
    expected = json.loads(expected_file.read_text())
    assert event.data == expected["data"]
    assert event.meta["license"] == expected["meta"]["license"]

    persisted = json.loads(redaction.read_text())
    assert event.data["email"] in persisted
    assert persisted[event.data["email"]] == "john@example.com"

    # idempotent replay
    assert worker.process_file(input_file) == []

    # DPIA report
    report = worker.generate_dpia_report(tmp_path / "dpia.md")
    text = report.read_text()
    assert "| email | 1 |" in text
    assert "| phone | 1 |" in text
    assert "| national_id | 1 |" in text


def test_json_lines_support(tmp_path):
    mapping = Path("contracts/mapping/person.json")
    redaction = tmp_path / "redact.json"
    worker = StreamingWorker(mapping, redaction)
    file = tmp_path / "input.jsonl"
    file.write_text(
        json.dumps(
            {
                "id": "2",
                "name": "Jane",
                "email": "jane@example.com",
                "phone": "555-5678",
                "ssn": "987-65-4321",
            }
        )
        + "\n"
    )
    events = worker.process_file(file)
    assert events[0].data["email"].startswith("<email:")
    assert events[0].meta["license"] == "CC-0"
