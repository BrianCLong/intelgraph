import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.mark.asyncio
async def test_create_and_list_classes():
  transport = ASGITransport(app=app)
  async with AsyncClient(transport=transport, base_url="http://test") as ac:
    ont = (await ac.post("/ontology/create", json={"name": "Test"})).json()
    cls = (await ac.post("/class/upsert", json={"ontology_id": ont["id"], "key": "Person", "label": "Person"})).json()
    assert cls["key"] == "Person"
    listing = (await ac.get(f"/ontology/{ont['id']}/classes")).json()
    assert listing[0]["key"] == "Person"
