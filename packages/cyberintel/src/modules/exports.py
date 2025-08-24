"""STIX bundle export utilities."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict


def export_stix(indicators: List[Dict[str, object]], sightings: List[Dict[str, object]], path: str | Path) -> Path:
  """Write a minimal STIX bundle to ``path`` and return the ``Path``."""
  objects = []
  for ind in indicators:
    objects.append(
      {
        "type": "indicator",
        "id": f"indicator--{uuid.uuid4()}",
        "pattern": f"[domain-name:value = '{ind['value']}']" if ind["type"] == "DOMAIN" else f"[ipv4-addr:value = '{ind['value']}']",
        "confidence": ind["confidence"],
        "labels": ind["labels"],
        "tlp": ind["tlp"],
      }
    )
  for sight in sightings:
    objects.append(
      {
        "type": "observed-data",
        "id": f"observed-data--{uuid.uuid4()}",
        "created": datetime.now(timezone.utc).isoformat(),
        "objects": {},
        "first_observed": sight["log"]["ts"],
        "last_observed": sight["log"]["ts"],
        "number_observed": 1,
        "tlp": sight["indicator"].get("tlp", "TLP:CLEAR"),
      }
    )
  bundle = {"type": "bundle", "id": f"bundle--{uuid.uuid4()}", "objects": objects}
  p = Path(path)
  p.write_text(json.dumps(bundle, indent=2))
  return p
