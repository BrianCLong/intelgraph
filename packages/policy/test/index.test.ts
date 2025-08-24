import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAccess } from '../src/index.js';

test('role policy', () => {
  assert.equal(canAccess('ADMIN', 'HIGH'), true);
  assert.equal(canAccess('VIEWER', 'HIGH'), false);
});
