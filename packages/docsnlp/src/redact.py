import re
from typing import Tuple

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def apply_redaction(text: str) -> Tuple[str, int]:
  redacted, n = EMAIL_RE.subn("[REDACTED]", text)
  return redacted, n
