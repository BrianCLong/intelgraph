# IntelGraph Search Service
# FastAPI service for hybrid keyword and vector search with incremental indexing
#
# MIT License
# Copyright (c) 2025 IntelGraph

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

# Attempt to import optional dependencies. The service can run in a limited
# mode without them which keeps tests lightweight.
try:  # pragma: no cover - optional dependency
    from opensearchpy import OpenSearch  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    OpenSearch = None  # type: ignore

logger = logging.getLogger("search-service")
audit_logger = logging.getLogger("search-audit")

app = FastAPI(title="IntelGraph Search Service", version="0.1.0")


class QueryRequest(BaseModel):
    query: str
    filters: Dict[str, Any] | None = None
    size: int = Field(default=10, ge=1, le=100)
    seed: Optional[int] = None


class SearchHit(BaseModel):
    id: str
    score: float
    source: Dict[str, Any]


class QueryResponse(BaseModel):
    hits: List[SearchHit]
    tookMs: int
    explain: Optional[Dict[str, Any]] = None


@app.post("/search/query", response_model=QueryResponse)
async def search(query: QueryRequest) -> QueryResponse:
    """Hybrid BM25 + ANN search stub."""
    start = time.time()
    audit_logger.info("query", extra={"q": query.query, "filters": query.filters})

    hits = [
        SearchHit(id="mock-1", score=1.0, source={"text": "example"}),
        SearchHit(id="mock-2", score=0.8, source={"text": "sample"}),
    ][: query.size]

    took_ms = int((time.time() - start) * 1000)
    return QueryResponse(hits=hits, tookMs=took_ms)


class IndexRequest(BaseModel):
    label: str
    action: str = Field(pattern="^(start|stop)$")


@app.post("/search/index")
async def index_control(req: IndexRequest) -> Dict[str, str]:
    """Start or stop background backfill processes."""
    audit_logger.info("index", extra=req.model_dump())
    return {"status": f"{req.action}ed", "label": req.label}


class SchemaInfo(BaseModel):
    name: str
    mapping: Dict[str, Any]
    vector_dims: int


@app.get("/search/schemas", response_model=List[SchemaInfo])
async def schemas() -> List[SchemaInfo]:
    """Return index mappings and vector dimensions."""
    audit_logger.info("schemas")
    return [
        SchemaInfo(
            name="nodes",
            mapping={"properties": {"text": {"type": "text"}}},
            vector_dims=384,
        ),
        SchemaInfo(
            name="edges",
            mapping={"properties": {"text": {"type": "text"}}},
            vector_dims=384,
        ),
    ]


try:  # pragma: no cover - optional dependency
    from aiokafka import AIOKafkaConsumer  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    AIOKafkaConsumer = None  # type: ignore


async def start_indexer() -> None:
    if AIOKafkaConsumer is None:
        logger.warning("aiokafka not installed; indexer disabled")
        return

    consumer = AIOKafkaConsumer("ingest.canonical.v1")  # type: ignore[arg-type]
    await consumer.start()
    try:
        async for msg in consumer:  # pragma: no cover - network loop
            logger.debug("consume", extra={"offset": msg.offset})
            # TODO: transform message and index into search backends
    finally:
        await consumer.stop()


if __name__ == "__main__":  # pragma: no cover - manual execution
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
