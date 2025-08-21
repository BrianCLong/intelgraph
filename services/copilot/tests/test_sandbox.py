import pytest
from httpx import AsyncClient

from copilot.app import app


@pytest.mark.asyncio
async def test_write_query_blocked() -> None:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.post(
            "/copilot/translate",
            json={"inputText": "create person named Bob", "allowWrites": False},
        )
    data = resp.json()
    assert data["cypher"] is None
    assert data["safetyReport"].startswith("blocked")
