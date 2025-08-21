import test from 'node:test';
import assert from 'node:assert';
import { buildExplainPayload } from './index.js';

test('buildExplainPayload produces explanation', () => {
  const result = buildExplainPayload('Q', [{ reason: 'selected field' }]);
  assert.equal(result.explanation, 'selected field');
});
