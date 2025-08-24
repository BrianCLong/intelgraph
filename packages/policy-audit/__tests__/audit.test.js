import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { audit, verify } from '../src/audit.js';

test('tampering breaks the chain', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'));
  audit({ decision: 'allow', reason: 'ok', subject: {}, resource: {} }, dir);
  audit({ decision: 'deny', reason: 'no', subject: {}, resource: {} }, dir);
  const file = path.join(dir, `audit-${new Date().toISOString().slice(0, 10)}.log`);
  assert.strictEqual(verify(file), true);
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const first = JSON.parse(lines[0]);
  first.reason = 'tampered';
  lines[0] = JSON.stringify(first);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  assert.strictEqual(verify(file), false);
});
