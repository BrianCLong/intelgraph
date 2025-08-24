from __future__ import annotations

import json

import httpx
from intelgraph_sdk import SDK
from IPython.core.interactiveshell import InteractiveShell
from IPython.core.magic import Magics, line_magic, magics_class


def _default_transport(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/nlq":
        data = json.loads(request.content.decode())
        return httpx.Response(200, json={"cypher": f"// cypher for {data['query']}"})
    return httpx.Response(404, json={"error": "not found"})


@magics_class
class IntelGraphMagics(Magics):
    """IPython magics for Intelgraph."""

    def __init__(self, shell: InteractiveShell) -> None:
        super().__init__(shell)
        self.sdk = SDK(transport=httpx.MockTransport(_default_transport))

    @line_magic("intelgraph")
    def intelgraph_line(self, line: str) -> str:
        parts = line.strip().split(" ", 1)
        if parts[0] == "nl" and len(parts) == 2:
            query = parts[1].strip("\"'")
        elif parts[0] == "nl":
            raise ValueError("Missing query")
        else:
            raise ValueError("Unknown command")
        result = self.sdk.nlq(query)
        cypher = result.to_cypher()
        print(cypher)
        return cypher
