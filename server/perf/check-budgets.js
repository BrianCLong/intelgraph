const fs = require('node:fs');
const path = require('node:path');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
}

const budget = readJson('budget.json');
const micro = readJson('microbench-results.json');
const load = readJson('load-results.json');

const latencyP95 = load.metrics.http_req_duration.values['p(95)'];
const rps = load.metrics.http_reqs.values.rate;
const memory = micro.memoryMb;

let ok = true;
if (latencyP95 > budget.p95LatencyMs) {
  console.error(`p95 latency ${latencyP95}ms exceeds budget ${budget.p95LatencyMs}ms`);
  ok = false;
}
if (rps < budget.peakRps) {
  console.error(`RPS ${rps} below budget ${budget.peakRps}`);
  ok = false;
}
if (memory > budget.memoryMb) {
  console.error(`Memory ${memory}MB exceeds budget ${budget.memoryMb}MB`);
  ok = false;
}

if (!ok) process.exit(1);
else console.log('Performance budgets met');
