import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/index.js';
import fetch from 'node-fetch';

test('documents query', async () => {
  const app = await createServer();
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const res = await fetch(`http://localhost:${port}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ documents { id } }' })
  });
  const data: any = await res.json();
  assert.deepEqual(data.data.documents, []);
  server.close();
});
