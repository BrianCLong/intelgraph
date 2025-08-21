from __future__ import annotations

from typing import Any

import json
import redis.asyncio as redis

STREAM_NAME = "redis:xnorm:events"


class RedisStream:
    def __init__(self, url: str | None = None) -> None:
        self._redis: redis.Redis = redis.from_url(  # type: ignore[no-untyped-call]
            url or "redis://localhost:6379", decode_responses=True
        )

    async def push(self, event: dict[str, Any]) -> None:
        await self._redis.xadd(STREAM_NAME, {"event": json.dumps(event)})

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        raw = await self._redis.get(f"ingest:job:{job_id}")
        return json.loads(raw) if raw else None

    async def set_job(self, job_id: str, data: dict[str, Any]) -> None:
        await self._redis.set(f"ingest:job:{job_id}", json.dumps(data))
