"""Streaming ingest worker with mapping DSL and PII redaction."""

from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:  # optional Faust dependency
    import faust  # type: ignore
except Exception:  # pragma: no cover - stubbed if Faust is unavailable
    faust = None  # type: ignore

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_RE = re.compile(r"\b\+?\d[\d\-\s]{7,}\d\b")
NATIONAL_ID_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")  # simple SSN pattern

TRANSFORMS: dict[str, Any] = {
    "int": int,
    "str": str,
    "upper": lambda x: str(x).upper(),
    "lower": lambda x: str(x).lower(),
}


@dataclass
class Event:
    data: dict[str, Any]
    meta: dict[str, Any]


class StreamingWorker:
    """Stream records from CSV/JSON lines and emit canonical entities."""

    def __init__(
        self,
        mapping_path: Path,
        redaction_path: Path,
        kafka_topic: str | None = None,
    ) -> None:
        self.mapping: dict[str, Any] = json.loads(Path(mapping_path).read_text())
        self.redaction_path = Path(redaction_path)
        self.redaction_map: dict[str, str] = self._load_redactions()
        self.dedupe: set[str] = set()
        self.license: str | None = self.mapping.get("license")
        self.kafka_topic = kafka_topic
        if kafka_topic and faust:
            self.app = faust.App("ingest-worker", broker="kafka://localhost")
            self.topic = self.app.topic(kafka_topic)
        else:  # pragma: no cover - exercised only with Kafka
            self.app = None
            self.topic = None

    # --- Redaction helpers -------------------------------------------------
    def _load_redactions(self) -> dict[str, str]:
        if self.redaction_path.exists():
            return json.loads(self.redaction_path.read_text())
        return {}

    def _persist_redactions(self) -> None:
        self.redaction_path.write_text(json.dumps(self.redaction_map, indent=2))

    def _classify(self, value: str) -> str | None:
        if EMAIL_RE.search(value):
            return "email"
        if PHONE_RE.search(value):
            return "phone"
        if NATIONAL_ID_RE.search(value):
            return "national_id"
        return None

    def _redact(self, value: str, kind: str | None = None) -> str:
        kind = kind or self._classify(value)
        if not kind:
            return value
        token = f"<{kind}:{hashlib.sha256(value.encode()).hexdigest()[:8]}>"
        self.redaction_map[token] = value
        return token

    # --- Mapping -----------------------------------------------------------
    def apply_mapping(self, record: dict[str, Any]) -> dict[str, Any]:
        output: dict[str, Any] = {}
        rules: dict[str, Any] = self.mapping.get("mappings", {})
        for field, value in record.items():
            spec = rules.get(field)
            if spec is None or spec.get("drop"):
                continue
            if spec.get("transform"):
                func = TRANSFORMS.get(spec["transform"])
                if func:
                    value = func(value)
            if spec.get("redact"):
                value = self._redact(str(value), spec.get("redact"))
            output[spec.get("map", field)] = value
        return output

    # --- Processing -------------------------------------------------------
    def _process_record(self, record: dict[str, Any], source: Path, line_no: int) -> list[Event]:
        canonical = self.apply_mapping(record)
        meta = {
            "lineage": {"file": str(source), "line": line_no},
            "license": self.license,
        }
        dedupe_key = (
            canonical.get("id")
            or hashlib.sha256(json.dumps(canonical, sort_keys=True).encode()).hexdigest()
        )
        if dedupe_key in self.dedupe:
            return []
        self.dedupe.add(dedupe_key)
        event = Event(canonical, meta)
        self._emit(event)
        return [event]

    def process_file(self, path: Path) -> list[Event]:
        events: list[Event] = []
        if path.suffix == ".csv":
            with path.open("r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for i, row in enumerate(reader, start=1):
                    events.extend(self._process_record(row, path, i))
        else:  # JSON lines
            with path.open("r", encoding="utf-8") as f:
                for i, line in enumerate(f, start=1):
                    row = json.loads(line)
                    events.extend(self._process_record(row, path, i))
        self._persist_redactions()
        return events

    # --- Emission ---------------------------------------------------------
    def _emit(self, event: Event) -> None:
        print(json.dumps({"data": event.data, "meta": event.meta}))
        if self.app and self.topic:  # pragma: no cover - Kafka optional
            try:
                self.app.send(self.topic, value=event.data)
            except Exception:
                pass

    # --- DPIA -------------------------------------------------------------
    def generate_dpia_report(self, path: Path) -> Path:
        counts = Counter(token.split(":")[0].strip("<") for token in self.redaction_map)
        lines = ["# DPIA Checklist", "", "| PII Type | Count |", "| --- | --- |"]
        for kind, count in sorted(counts.items()):
            lines.append(f"| {kind} | {count} |")
        Path(path).write_text("\n".join(lines))
        return Path(path)


__all__ = ["StreamingWorker", "Event"]
