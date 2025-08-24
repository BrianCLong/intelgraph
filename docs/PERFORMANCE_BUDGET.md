# Performance Budget

This repository enforces a baseline performance budget for the **server** application:

| Metric       | Budget    |
| ------------ | --------- |
| p95 latency  | <= 200 ms |
| Peak RPS     | >= 100    |
| Memory usage | <= 512 MB |

## Microbenchmarks

Run hot-path microbenchmarks for utility functions:

```bash
npm run perf:micro
```

Results are written to `server/perf/microbench-results.json`.

## Load Testing

Execute a lightweight load test against the `/health` endpoint using [k6](https://k6.io/):

```bash
# In one terminal start the server
npm run server:dev
# In another terminal run the load generator
npm run perf:load
```

This produces `server/perf/load-results.json` for analysis.

## Budget Check

Combine benchmark results and verify they meet the budget:

```bash
npm run perf:check
```

The script exits with non-zero status if any budget is exceeded and is suitable for CI.

## Profiling

1. Run the server with profiling enabled:
   ```bash
   node --inspect server/dist/index.js
   ```
2. Capture CPU/heap profiles via Chrome DevTools or `clinic flame`.
3. Focus on slow GraphQL resolvers, data redaction, and database calls.

## Tuning Checklist

- [ ] Record baseline: `npm run perf:micro` and `npm run perf:load`.
- [ ] Profile hot paths and identify bottlenecks.
- [ ] Apply optimizations (e.g., caching, query tuning).
- [ ] Re-run benchmarks and document before/after numbers.
- [ ] Commit updated results and profiling notes.
