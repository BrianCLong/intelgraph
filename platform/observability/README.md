# Observability Pack

Drop-in libraries for consistent tracing, metrics and logging across services.

## Components
- **Tracing**: OpenTelemetry SDK with common attributes.
- **Metrics**: Prometheus exporters.
- **Logging**: Structured logging with PII redaction.
- **Dashboards**: Grafana JSON for service SLOs.

## Initial SLOs
- Gateway p95 latency < 1500ms
- Error rate < 0.5%
- Ingest lag < 2m

Each language folder exposes a `setup` function that configures tracing, metrics and logging.
