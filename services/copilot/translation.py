from __future__ import annotations

import os
import re
from typing import Any, Dict

from .providers.base import get_provider

SENSITIVE_FIELDS = {"ssn", "password", "secret"}
WRITE_OPERATIONS = {"CREATE", "MERGE", "DELETE", "SET"}


class Translator:
    def __init__(self) -> None:
        provider_name = os.environ.get("LLM_PROVIDER", "mock")
        self.provider = get_provider(provider_name)

    async def translate(self, text: str, allow_writes: bool) -> Dict[str, Any]:
        query, hints, explanation, qtype = await self.provider.translate(text)
        query = self._redact(query)
        report = self._analyze(query, allow_writes)
        if report.startswith("blocked"):
            return {
                "cypher": None,
                "graphql": None,
                "parameterHints": {},
                "safetyReport": report,
                "explanation": explanation,
            }
        body: Dict[str, Any] = {
            "parameterHints": hints,
            "safetyReport": report,
            "explanation": explanation,
        }
        body[qtype] = query
        return body

    def _redact(self, query: str) -> str:
        pattern = re.compile("|".join(SENSITIVE_FIELDS), re.IGNORECASE)
        return pattern.sub("REDACTED", query)

    def _analyze(self, query: str, allow_writes: bool) -> str:
        upper = query.upper()
        if any(op in upper for op in WRITE_OPERATIONS) and not allow_writes:
            return "blocked: write operations require allowWrites=true"
        return "ok"
