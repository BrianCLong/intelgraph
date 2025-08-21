# SLO Dashboards

This directory contains Grafana dashboards for monitoring query latency SLOs.

## Query Latency Heatmap

The `query-latency-heatmap.json` dashboard visualizes query latency buckets collected via OpenTelemetry and exposed to Prometheus. It renders a heatmap over time using the `query_latency_seconds_bucket` metric to help track compliance with p95 service level objectives.
