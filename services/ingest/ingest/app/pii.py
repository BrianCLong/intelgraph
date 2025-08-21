from __future__ import annotations

import re
from typing import List

try:
    import magic
except Exception:  # pragma: no cover
    magic = None  # type: ignore[assignment]

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\b\+?\d[\d\s().-]{7,}\d\b")
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")


def detect_pii(value: str) -> List[str]:
    """Return a list of PII types detected in the given value."""

    types: List[str] = []
    if EMAIL_RE.search(value):
        types.append("email")
    if PHONE_RE.search(value):
        types.append("phone")
    if SSN_RE.search(value):
        types.append("ssn")
    if magic:
        try:
            file_type = magic.from_buffer(value.encode(), mime=True)
            if file_type not in {"text/plain", "application/json"}:
                types.append("file")
        except Exception:  # pragma: no cover
            pass
    return types


def apply_redaction(value: str, pii_types: List[str], rules: dict[str, str]) -> str:
    for t in pii_types:
        if t in rules:
            return rules[t]
    return value
