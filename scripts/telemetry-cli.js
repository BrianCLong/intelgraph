#!/usr/bin/env node
const fs = require('fs');

const file = process.argv[2] || 'telemetry.log';
if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const stream = fs.createReadStream(file, { encoding: 'utf8' });
let buffer = '';
const stats = { started: 0, completed: 0, error: 0, abandon: 0, latency: [] };

stream.on('data', (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      switch (event.type) {
        case 'task_started':
          stats.started++;
          break;
        case 'task_completed':
          stats.completed++;
          if (event.decision_latency_ms) stats.latency.push(event.decision_latency_ms);
          break;
        case 'error':
          stats.error++;
          break;
        case 'abandon':
          stats.abandon++;
          break;
      }
    } catch {
      // ignore invalid lines
    }
  }
});

stream.on('end', () => {
  const avgLatency =
    stats.latency.reduce((a, b) => a + b, 0) / (stats.latency.length || 1);
  console.log('--- Telemetry KPIs ---');
  console.log(`Tasks Started: ${stats.started}`);
  console.log(`Tasks Completed: ${stats.completed}`);
  console.log(`Errors: ${stats.error}`);
  console.log(`Abandoned: ${stats.abandon}`);
  console.log(`Avg Decision Latency (ms): ${avgLatency.toFixed(2)}`);
});
