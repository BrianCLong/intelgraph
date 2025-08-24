from __future__ import annotations

import httpx
from intelgraph_jupyterkit import IntelGraphMagics
from intelgraph_sdk import SDK
from IPython import get_ipython
from pytest import MonkeyPatch


def test_line_magic(monkeypatch: MonkeyPatch) -> None:
    ip = get_ipython()
    magics = IntelGraphMagics(ip)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"cypher": "MATCH ()"})

    magics.sdk = SDK(transport=httpx.MockTransport(handler))
    out = magics.intelgraph_line('nl "query"')
    assert out == "MATCH ()"
