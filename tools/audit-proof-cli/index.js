#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { verifyBundle } from '../../packages/sdk/audit-js/src/index.js';

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
if (fileIdx === -1 || !args[fileIdx + 1]) {
  console.error('usage: audit verify --file <bundle>');
  process.exit(1);
}

const bundlePath = args[fileIdx + 1];
const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
const ok = verifyBundle(bundle);
if (ok) {
  console.log('green');
  process.exit(0);
}
console.log('red');
process.exit(1);
