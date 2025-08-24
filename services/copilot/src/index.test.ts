import test from 'node:test';
import assert from 'node:assert/strict';
import { ask } from './index.js';

const headers = {
  'x-tenant': 't1',
  'x-user': 'u1',
  'x-legal-basis': 'law',
  'x-reason': 'investigation',
  'x-operation': 'AskCopilot'
};

test('throws without required headers', () => {
  assert.throws(() => ask({}, 'hello'), /missing required header/);
});

test('returns answer with citation', () => {
  const res = ask(headers, 'What is IntelGraph?');
  assert.ok(/IntelGraph/.test(res.answer));
  assert.equal(res.citations.length, 1);
  assert.notEqual(res.answer, 'insufficient evidence');
  assert.equal(res.coverage, 1);
  assert.equal(res.faithfulness, 1);
});

test('returns insufficient evidence when no snippets', () => {
  const res = ask(headers, 'unknown question');
  assert.equal(res.answer, 'insufficient evidence');
  assert.equal(res.citations.length, 0);
});
