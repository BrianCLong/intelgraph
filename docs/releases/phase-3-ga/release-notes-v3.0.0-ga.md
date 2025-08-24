# IntelGraph v3.0.0‑GA — Release Notes

**Release Version:** v3.0.0‑ga
**Release Date:** August 23, 2025
**Owner:** IntelGraph Program Team
**Contact:** Stakeholder Management Team · incidents@intelgraph.example · #intelgraph-go-live

---

## Highlights (TL;DR)

- UNANIMOUS GO‑LIVE AUTHORIZATION by the IntelGraph Advisory Council.
- Performance: 1.2M events/sec (sub‑8 ms), API p95 127 ms, Graph p95 1.2 s — all targets exceeded.
- Security: ABAC/OPA enforcing (default ON), authority binding at query time, immutable audit with cryptographic signing.
- Resilience & DR: Broker kill recovery in 1 m 47 s; cross‑region DR RTO 45 min / RPO 3 min.
- Cost Governance: 31% under budget; real‑time caps; slow‑query killer; executive cost dashboard.
- Visual Intelligence: WebGL/WebGPU 3D graphs with AR/VR (WebXR), collaborative views.

## What’s New

- Advanced ML Engine — Multi‑modal intelligence processing (text, images, documents); ModelManager for lifecycle + load balancing.
- Real‑Time Stream Processing — Kafka/Pulsar/Redis Streams with adaptive backpressure, anomaly detection at ingest.
- API Federation Gateway — Apollo Federation, enterprise rate limiting, circuit breakers, distributed tracing.
- Production Infra — HA Postgres + Neo4j, Redis cache, Traefik TLS, full observability (Prometheus/Grafana/Jaeger), automated backups.

## Why It Matters

- Faster analysis on larger graphs and streams.
- Stronger guarantees on security, auditability, and governance.
- Operational confidence via chaos‑tested failover and DR.
- Lower total cost with enforced budgets and real‑time visibility.

## SLOs (Public)

| Metric            |            Target |        Achieved |
| ----------------- | ----------------: | --------------: |
| API p95 latency   |          ≤ 150 ms |          127 ms |
| Graph query p95   |           ≤ 1.5 s |           1.2 s |
| Stream throughput | ≥ 1.0M events/sec | 1.2M events/sec |
| DR RTO            |          ≤ 60 min |          45 min |
| DR RPO            |           ≤ 5 min |           3 min |

## Security & Compliance

- ABAC/OPA enforcing (default ON) with policy attestations.
- Authority Binding at query time; immutable audit (Ed25519 signatures + hourly notarization).
- SBOM & Secrets Hygiene: continuous scanning; persisted queries required in production.

## Deprecations & Breaking Changes

- Ad‑hoc GraphQL queries are denied in production (persisted queries only).
- Legacy /v2 ingestion endpoints are supported through Q4 2025; migrate to /v3.

## Upgrade / Adoption Guidance

1. Register persisted queries for production workloads.
2. Verify tenant budgets and role‑based cost limits.
3. Review authority‑binding scopes for sensitive fields.
4. Migrate ingest to /v3 endpoints and enable anomaly‑detection flags.
5. For AR/VR, ensure WebXR support or use 2D/3D fallback modes.

## Known Issues (Minor)

- Some browsers throttle WebXR in background tabs; visualization degrades gracefully to 2D/3D.
- First load of very large graphs may trigger a one‑time LOD cache build.

## Support

- Status Page: see announcement in this folder.
- Escalation: follow incident matrix; 24×7 on‑call active.

---

For full validation artifacts, see the Evidence Pack index at `docs/releases/phase-3-ga/`.
