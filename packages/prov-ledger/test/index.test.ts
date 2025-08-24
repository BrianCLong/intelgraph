import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createManifest } from '../src/index.js';

test('creates manifest', () => {
  const m = createManifest('1', 'hello');
  assert.equal(m.id, '1');
  assert.equal(m.sha256.length, 64);
});
