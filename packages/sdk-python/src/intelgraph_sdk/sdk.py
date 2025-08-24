from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path

import httpx

from .models import ExportResult, GraphSnapshot, NLQuery


class SDK:
    """Lightweight client for Intelgraph APIs."""

    def __init__(
        self,
        base_url: str = "https://api.intelgraph.local",
        *,
        token: str | None = None,
        allow_writes: bool = False,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._client = httpx.Client(base_url=base_url, headers=headers, transport=transport)
        self._allow_writes = allow_writes

    def __repr__(self) -> str:  # pragma: no cover - simple repr
        token = self._client.headers.get("Authorization")
        if token:
            token = "Bearer ***"
        return (
            f"SDK(base_url='{str(self._client.base_url)}', token='{token}', allow_writes={self._allow_writes})"
        )

    # Natural language query -------------------------------------------------
    def nlq(self, query: str) -> NLQuery:
        resp = self._client.post("/nlq", json={"query": query})
        resp.raise_for_status()
        data = resp.json()
        return NLQuery(query=query, cypher=data.get("cypher", ""))

    # Graph operations -------------------------------------------------------
    def graph_snapshot(self, as_of: datetime | None = None) -> GraphSnapshot:
        params = {"as_of": as_of.isoformat()} if as_of else {}
        resp = self._client.get("/graph/snapshot", params=params)
        resp.raise_for_status()
        return GraphSnapshot(**resp.json())

    # Report export ----------------------------------------------------------
    def report_export(self, content: str, template: str, *, path: Path | str) -> ExportResult:
        provenance = {"template": template, "generated_at": datetime.utcnow().isoformat()}
        body = f"# provenance\n{json.dumps(provenance)}\n# content\n{content}\n"
        file_path = Path(path)
        file_path.write_text(body, encoding="utf-8")
        digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
        return ExportResult(path=file_path, sha256=digest)
