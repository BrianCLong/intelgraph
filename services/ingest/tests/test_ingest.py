import asyncio
import json
from pathlib import Path
from typing import Any, cast

import fakeredis.aioredis

from ingest.app.ingest import run_job
from ingest.app.models import IngestJobRequest
from ingest.app.redis_stream import RedisStream, STREAM_NAME


BASE = Path(__file__).resolve().parent.parent


def load_json(path: str) -> dict[str, Any]:
    with open(BASE / path, "r", encoding="utf-8") as f:
        return cast(dict[str, Any], json.load(f))


async def _run() -> None:
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    stream = RedisStream()
    stream._redis = fake

    schema_map = load_json("sample_data/mapping.json")
    redaction = load_json("sample_data/redaction.json")
    req = IngestJobRequest(
        sourceType="csv",
        source=str(BASE / "sample_data/sample.csv"),
        schemaMap=schema_map,
        redactionRules=redaction,
    )
    status = await run_job("job1", req, stream)
    assert status.processed == 2
    entries = await fake.xrange(STREAM_NAME)
    assert len(entries) == 2
    data = json.loads(entries[0][1]["event"])
    assert data["tenantId"] == "t1"
    assert data["entityType"] == "person"
    assert data["attributes"]["email"] == "[REDACTED]"


def test_ingest_run() -> None:
    asyncio.run(_run())


def test_event_envelope_contract() -> None:
    from ingest.app.models import EventEnvelope

    envelope = EventEnvelope(
        tenantId="t",
        entityType="e",
        attributes={},
        provenance={},
        policy={},
    )
    assert set(envelope.model_dump().keys()) == {
        "tenantId",
        "entityType",
        "attributes",
        "provenance",
        "policy",
    }
