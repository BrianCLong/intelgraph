from __future__ import annotations

"""Simple data quality engine supporting the ``not_null`` expectation."""

from typing import Dict, Iterable, List, Mapping


def run_dq(rows: Iterable[Mapping[str, str]], field: str) -> List[str]:
    """Return a list of error messages for rows where ``field`` is missing or null."""
    errors: List[str] = []
    for idx, row in enumerate(rows, start=1):
        if field not in row or row[field] in (None, ""):
            errors.append(f"row {idx} missing field {field}")
    return errors
