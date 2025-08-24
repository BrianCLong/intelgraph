from __future__ import annotations

import time
from contextlib import asynccontextmanager

from prometheus_client import Counter, Histogram

requests_total = Counter("requests_total", "Total requests", ["route"])
latency_ms = Histogram("latency_ms", "Request latency", ["route"])
cf_search_ms = Histogram("cf_search_ms", "Counterfactual search latency")
robustness_samples_total = Counter("robustness_samples_total", "Robustness samples")


@asynccontextmanager
async def track(route: str):
    requests_total.labels(route).inc()
    start = time.time()
    try:
        yield
    finally:
        latency_ms.labels(route).observe((time.time() - start) * 1000)

