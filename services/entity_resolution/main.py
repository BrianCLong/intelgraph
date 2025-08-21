from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest

from .matchers import deterministic_match, probabilistic_match
from .models import Factor, MatchRequest, MatchResponse
from .storage import SQLiteFeatureStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

tracer_provider = TracerProvider()
trace.set_tracer_provider(tracer_provider)
tracer_provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
tracer = trace.get_tracer(__name__)

app = FastAPI()
store = SQLiteFeatureStore()
REQUEST_COUNTER = Counter("er_match_requests_total", "Total match requests", ["tenant", "decision"])


@app.post("/er/match", response_model=MatchResponse)
async def match(req: MatchRequest) -> MatchResponse:
    """Evaluate candidates and return the best match decision."""

    with tracer.start_as_current_span("er_match"):
        record = req.record
        best_decision: str = "new"
        best_score: float = 0.0
        best_factors: list[Factor] = []
        for cand in req.candidates:
            result = deterministic_match(record, cand)
            if result is None:
                result = probabilistic_match(req.tenant, record, cand)
            if result["score"] > best_score:
                best_decision = str(result["decision"])
                best_score = float(result["score"])
                best_factors = list(result["factors"])
        REQUEST_COUNTER.labels(tenant=req.tenant, decision=best_decision).inc()
        store.save(record.id, {"decision": best_decision, "score": best_score})
        return MatchResponse(decision=best_decision, score=best_score, factors=best_factors)


@app.get("/metrics")
async def metrics() -> PlainTextResponse:
    data = generate_latest()
    return PlainTextResponse(data.decode("utf-8"), media_type=CONTENT_TYPE_LATEST)
