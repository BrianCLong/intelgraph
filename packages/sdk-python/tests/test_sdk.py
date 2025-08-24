from __future__ import annotations

import hashlib
import json
from pathlib import Path

import httpx
from intelgraph_sdk import SDK


def test_nlq_to_cypher(tmp_path: Path) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        data = json.loads(request.content.decode())
        return httpx.Response(200, json={"cypher": f"// cypher for {data['query']}"})

    sdk = SDK(transport=httpx.MockTransport(handler))
    result = sdk.nlq("show connections")
    assert result.to_cypher() == "// cypher for show connections"


def test_graph_snapshot(tmp_path: Path) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/graph/snapshot":
            return httpx.Response(200, json={"as_of": "2024-01-01T00:00:00", "nodes": [], "edges": []})
        raise AssertionError("unexpected path")

    sdk = SDK(transport=httpx.MockTransport(handler))
    snap = sdk.graph_snapshot()
    assert snap.nodes == []


def test_report_export(tmp_path: Path) -> None:
    sdk = SDK(transport=httpx.MockTransport(lambda _: httpx.Response(200, json={})))
    path = tmp_path / "report.txt"
    result = sdk.report_export("hello", template="tpl", path=path)
    content = path.read_text()
    assert "tpl" in content
    assert result.sha256 == hashlib.sha256(content.encode()).hexdigest()


def test_token_redaction() -> None:
    sdk = SDK(token="secret", transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"cypher": ""})))
    assert "secret" not in repr(sdk)
