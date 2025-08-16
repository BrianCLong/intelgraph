### IntelGraph — Velocity Plan v4: Tenant Safety & Performance Hardening

**Owner:** Guy — Theme: multi-tenant isolation + big graph performance

**Priorities**

1. Tenant isolation across API/Neo4j/Postgres/Redis + OPA tests
2. Neighborhood cache with invalidation
3. Neo4j indexing pass & query hints
4. Cytoscape LOD for large graphs

**PR scaffolds**

- `security/multi-tenant` — feat(security): enforce tenant scoping across API/DB/cache
- `perf/neighborhood-cache` — feat(perf): Redis neighborhood cache + invalidation
- `perf/neo4j-indexing` — feat(perf): Neo4j indexes + query tuning
- `ui/cytoscape-lod` — feat(ui): LOD for large graphs

**Acceptance criteria**

- No cross-tenant reads/writes; OPA/unit tests pass
- Neighborhood cache hit ≥70%; invalidation verified
- Hot endpoint p95 ↓≥30%; PROFILE shows index usage
- > 50k elements interactive (<16ms/frame), labels toggle

**Observability**

- Metrics: `neighborhood_cache_hit_ratio`, `neo4j_query_ms`
- Alerts: cache hit <50% (warn), p95 query > target (warn)

**Next steps**

- Cut branches, open draft PRs, wire tests into CI
