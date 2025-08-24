import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PolicyEvaluator } from '../src/index.ts';
import type { User } from '../src/index.ts';

const evaluator = new PolicyEvaluator();

const user: User = { id: 'u1', roles: ['ANALYST'] };
const admin: User = { id: 'a1', roles: ['ADMIN'] };

test('denies restricted license for non-admin', () => {
  const result = evaluator.evaluate(user, {}, 'read', { licenseClass: 'restricted' });
  assert.equal(result.allowed, false);
});

test('allows admin regardless of license', () => {
  const result = evaluator.evaluate(admin, {}, 'read', { licenseClass: 'restricted' });
  assert.equal(result.allowed, true);
});
