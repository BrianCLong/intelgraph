# Telemetry

Grafana dashboard and Prometheus metrics for core SLOs.

- `graph_query_duration_seconds` – p95 <1.5s for 3-hop queries over 50k nodes.
- `ingest_e2e_duration_seconds` – p95 <300s for 10k document ingest.

Import `slo-dashboard.json` into Grafana to visualize SLO burn rates.
