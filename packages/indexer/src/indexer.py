from __future__ import annotations

import asyncio
from typing import Iterable

import aiohttp


async def index_records(records: Iterable[dict], endpoint: str = "http://localhost:8000/index/upsert") -> int:
    async with aiohttp.ClientSession() as session:
        async with session.post(endpoint, json={"records": list(records)}) as resp:
            data = await resp.json()
            return data.get("count", 0)


async def main():
    sample = [{"id": "1", "text": "Alpha"}]
    await index_records(sample)


if __name__ == "__main__":
    asyncio.run(main())
