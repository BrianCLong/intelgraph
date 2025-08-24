import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redactData } from '../src/utils/dataRedaction.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ITERATIONS = 1000;
const samples: number[] = [];

const sampleData = {
  email: 'user@example.com',
  phone: '555-1234',
  name: 'Alice Agent',
  address: '123 Main St',
};

const user = { id: 'u1', role: 'ANALYST' } as any;

for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  redactData(sampleData, user);
  const duration = performance.now() - start;
  samples.push(duration);
}

samples.sort((a, b) => a - b);
const p95 = samples[Math.floor(ITERATIONS * 0.95)];
const avg = samples.reduce((a, b) => a + b, 0) / ITERATIONS;

const memoryMb = process.memoryUsage().rss / 1024 / 1024;

const results = {
  function: 'redactData',
  iterations: ITERATIONS,
  avgMs: Number(avg.toFixed(3)),
  p95Ms: Number(p95.toFixed(3)),
  memoryMb: Number(memoryMb.toFixed(1)),
};

const outFile = path.join(__dirname, 'microbench-results.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
