import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RelayServer } from '../dist/src/index.js';

test('relay forwards messages to subscribers', () => {
  const server = new RelayServer();
  let received = 0;
  server.subscribe('room1', () => {
    received += 1;
  });
  server.send('room1', { type: 'offer', payload: {} });
  assert.equal(received, 1);
});
