import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createManifest, verifyManifest } from '../dist/src/index.js';

test('manifest verification succeeds for signed data', () => {
  const manifest = createManifest('hello');
  assert.ok(verifyManifest(manifest));
});
