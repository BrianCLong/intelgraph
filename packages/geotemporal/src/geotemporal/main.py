from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import Counter, CONTENT_TYPE_LATEST, generate_latest

app = FastAPI(title="GA-GeoTemporal")

requests_counter = Counter("requests_total", "Total HTTP requests")

@app.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint."""
    requests_counter.inc()
    return {"status": "ok"}


@app.get("/metrics")
def metrics() -> Response:
    """Expose Prometheus metrics."""
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
