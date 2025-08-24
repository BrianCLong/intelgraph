import re
from typing import List, Dict

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
NAME_RE = re.compile(r"\b([A-Z][a-z]+)\b")


def extract_entities(text: str) -> List[Dict]:
  entities: List[Dict] = []
  for match in EMAIL_RE.finditer(text):
    entities.append({"type": "EMAIL", "text": match.group(), "start": match.start(), "end": match.end()})
  for match in NAME_RE.finditer(text):
    entities.append({"type": "PERSON", "text": match.group(), "start": match.start(), "end": match.end()})
  return entities
