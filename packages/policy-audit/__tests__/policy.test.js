import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/policy.js';

function rand() {
  return Math.random().toString(36).substring(2);
}

test('random inputs without policies are denied', () => {
  for (let i = 0; i < 50; i++) {
    const input = {
      subject: { clearance: rand() },
      action: rand(),
      resource: { classification: rand() },
      context: { purpose: rand() }
    };
    const res = evaluate(input, []);
    assert.strictEqual(res.allow, false);
  }
});
