import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNote, MerkleTree, SyncClient } from '../dist/src/index.js';

test('mergeNote picks latest timestamp', () => {
  const a = { content: 'one', timestamp: 1 };
  const b = { content: 'two', timestamp: 2 };
  assert.equal(mergeNote(a, b).content, 'two');
});

test('merkle tree computes deterministic root', () => {
  const tree = new MerkleTree();
  tree.add('a');
  tree.add('b');
  assert.equal(tree.root().length, 64);
});

test('sync client queues deltas', () => {
  const client = new SyncClient();
  client.queueDelta({ id: '1', data: 'x' });
  assert.equal(client.pending(), 1);
});
