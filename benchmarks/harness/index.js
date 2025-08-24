const { performance } = require('perf_hooks');
const { generateGraph } = require('@intelgraph/synthdata-js');

function runBenchmark(iterations = 1000) {
  const latencies = [];
  const spec = { seed: 'bench', counts: { persons: 10, orgs: 5, assets: 3, comms: 10 } };
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    generateGraph(spec);
    const t1 = performance.now();
    latencies.push(t1 - t0);
  }
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(0.5 * latencies.length)];
  const p95 = latencies[Math.floor(0.95 * latencies.length)];
  const total = latencies.reduce((a, b) => a + b, 0);
  const throughput = iterations / (total / 1000);
  return { p50, p95, throughput, errorRate: 0 };
}

module.exports = { runBenchmark };
