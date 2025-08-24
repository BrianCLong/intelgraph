"""Simple correlation engine."""
from __future__ import annotations

from typing import List, Dict


def correlate(indicators: List[Dict[str, object]], logs: List[Dict[str, str]]):
  """Return sightings where DNS query matches a domain indicator."""
  index = {
    (i["type"], i["value"]): i for i in indicators
  }
  sightings: List[Dict[str, object]] = []
  for log in logs:
    key = ("DOMAIN", log.get("query", ""))
    ind = index.get(key)
    if ind:
      sightings.append({"indicator": ind, "log": log})
  return sightings
