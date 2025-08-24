# Bitemporal Graph Time Machine

This design introduces bitemporal graph storage with `AS OF` queries, `DIFF` views and a What‑If simulator for forecasting and counterfactual analysis.

## Bitemporal Model

- Nodes, edges and properties carry `valid_from`, `valid_to`, `tx_from` and `tx_to` timestamps.
- Retroactive and corrective updates append new intervals and close previous ones without losing history.
- Postgres maintains a `temporal_index` to prune candidates before executing Neo4j predicates.

## AS OF Queries

- `graphAsOf` reconstructs the graph at a given valid or transaction time.
- A planner combines Postgres temporal filtering with Neo4j `valid_from`/`valid_to` predicates.
- Results are cached as materialised snapshots keyed by `(case, branch, instant, filter)` with TTL and invalidation on overlapping writes.

## DIFF Views

- `graphDiff` compares two instants or windows and classifies entities as `added`, `removed` or `changed`.
- Explanations trace which deltas triggered each change.

## Snapshot Cache

- Redis stores projection subgraphs; keys use the pattern `case@branch|filter|instant`.
- LRU + TTL eviction; a lease protocol prevents thundering herds on cold caches.

## What-If Simulator

- The simulator applies a hypothetical change‑set in isolation and runs propagation models:
  - reachability BFS
  - personalised PageRank‑Δ
  - SIR contagion
  - shortest‑path Δ
  - simple risk cascade
- Deterministic seeds ensure identical inputs yield identical outputs.

## Auditability & Policy

- Each AS OF/DIFF/SIM run records inputs, seeds, policies and code version for replayability.
- OPA policies filter or redact sensitive entities by time; blocked operations return human‑readable reasons.

## Tech Components

- **Temporal Service (`services/time`)** – temporal indexer, snapshotter, diff engine, compactor.
- **Simulator Service (`services/sim`)** – scenario runner built on NetworkX.
- **GraphQL (`server/graphql/time`)** – temporal types, queries, mutations and subscriptions.
- **Web UI (`apps/web/src/features/time-machine`)** – React + MUI time scrubber, compare mode and scenario builder.
- **CLI (`cli/ig-time`, `cli/ig-sim`)** – snapshot, diff, simulate and export tools.

## Performance Targets

- AS OF p95 ≤ 1.2s (cached) / ≤ 4.5s (cold) on 50M edges.
- DIFF p95 ≤ 6s on 10M‑edge windows.
- Reachability on a 1M‑node subgraph p95 ≤ 8s; PPR‑Δ ≤ 12s for 100k changed edges.

## Testing & Determinism

- Unit: interval arithmetic, predicate builders, diff classification, compaction rules, simulator steps.
- Property‑based: randomised delta streams with non‑overlap invariants.
- Integration: AS OF → DIFF → SIM pipeline on 50M‑edge synthetic graph.
- Determinism: identical seeds and inputs produce identical outputs.

## Next Steps

Implement the temporal data model, snapshot cache and diff engine, flesh out simulator models, expose GraphQL API and UI, and deliver CLI commands.
