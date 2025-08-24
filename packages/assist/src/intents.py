import re
from enum import Enum

class Intent(Enum):
  RISK = 'risk'
  NEIGHBORS = 'neighbors'
  DOCS = 'docs'

RISK_RE = re.compile(r'risk', re.I)
NEIGHBORS_RE = re.compile(r'neighbor', re.I)
DOCS_RE = re.compile(r'doc', re.I)

def parse(text: str) -> Intent | None:
  if RISK_RE.search(text):
    return Intent.RISK
  if NEIGHBORS_RE.search(text):
    return Intent.NEIGHBORS
  if DOCS_RE.search(text):
    return Intent.DOCS
  return None
