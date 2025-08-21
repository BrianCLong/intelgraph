import pytest
from httpx import AsyncClient

from copilot.app import app


@pytest.mark.asyncio
async def test_rag_endpoint_returns_citation() -> None:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.post("/copilot/rag", json={"question": "copilot"})
    data = resp.json()
    assert data["citations"]
    assert data["citations"][0]["start"] >= 0
