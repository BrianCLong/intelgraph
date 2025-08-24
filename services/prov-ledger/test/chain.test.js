import test from 'node:test';
import assert from 'node:assert/strict';
import { appendRecord, chain } from '../src/index.js';

test('appendRecord links hashes', () => {
  chain.length = 0;
  const a = appendRecord('claim', { id: '1', license: 'MIT', source: 'src' });
  const b = appendRecord('claim', { id: '2', license: 'MIT', source: 'src' });
  assert.equal(chain.length, 2);
  assert.equal(b.prevHash, a.hash);
});
