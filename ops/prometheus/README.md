# Prometheus SLO Rules

- File: `prometheus-rule-slo.yaml`
- Purpose: Alert on p95 graph query latency and error budget burn.
- How to use: Load into PrometheusRule (Prometheus Operator) or server config; pair with canary values.
- Acceptance: Alerts fire on sustained p95>1.5s (10m) or error ratio>2% (15m).
