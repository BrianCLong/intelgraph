"""Feed parsers for STIX and CSV indicators."""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import List, Dict

from .normalizers import normalize_indicator, dedupe_indicators

STIX_PATTERN = re.compile(r"\[([a-z0-9\-]+):value\s*=\s*'([^']+)'", re.IGNORECASE)


def import_stix(path: str | Path) -> List[Dict[str, object]]:
  """Import indicators from a minimal STIX 2.1 bundle.

  Only ``indicator`` objects with a simple equality pattern are supported.
  The ``type`` in the STIX pattern is mapped to a generic indicator ``type``.
  """
  p = Path(path)
  data = json.loads(p.read_text())
  indicators: List[Dict[str, object]] = []
  for obj in data.get("objects", []):
    if obj.get("type") != "indicator":
      continue
    pattern = obj.get("pattern", "")
    match = STIX_PATTERN.search(pattern)
    if not match:
      continue
    raw_type, value = match.groups()
    ind_type = "DOMAIN" if raw_type == "domain-name" else "IP"
    indicators.append(
      normalize_indicator(
        {
          "type": ind_type,
          "value": value,
          "confidence": obj.get("confidence", 0),
          "tlp": obj.get("tlp", "TLP:CLEAR"),
          "labels": obj.get("labels", []),
        }
      )
    )
  return dedupe_indicators(indicators)


def import_csv(path: str | Path) -> List[Dict[str, object]]:
  """Import indicators from a CSV file."""
  p = Path(path)
  with p.open(newline="") as fh:
    reader = csv.DictReader(fh)
    rows = [normalize_indicator(row) for row in reader]
  return dedupe_indicators(rows)


def import_feed(kind: str, path: str | Path) -> List[Dict[str, object]]:
  """Dispatch import based on ``kind`` (``STIX`` or ``CSV``)."""
  kind = kind.upper()
  if kind == "STIX":
    return import_stix(path)
  if kind == "CSV":
    return import_csv(path)
  raise ValueError(f"unsupported feed kind: {kind}")
