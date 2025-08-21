import { Histogram, Counter, Registry } from 'prom-client-browser';
export const registry = new Registry();
export const syncLatency = new Histogram({
  name: 'ui_sync_latency_ms',
  help: 'UI sync latency',
  buckets: [25, 50, 100, 200, 400, 800],
  registers: [registry],
});
export const syncEvents = new Counter({
  name: 'ui_sync_events_total',
  help: 'Sync events',
  labelNames: ['source'],
  registers: [registry],
});

export function markSync(source: 'timeline' | 'map' | 'graph', fn: () => void) {
  syncEvents.inc({ source });
  const start = performance.now();
  fn();
  syncLatency.observe(performance.now() - start);
}
