import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed } from '../dist/src/index.js';

test('policy rule grants access for matching label and role', () => {
  const allowed = isAllowed({ role: 'agent', labels: ['a'] }, { label: 'a', roles: ['agent'] });
  assert.equal(allowed, true);
});
