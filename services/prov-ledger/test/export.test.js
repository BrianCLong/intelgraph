import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'crypto';
import { app } from '../src/index.js';

function startServer() {
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server));
  });
}

test('exported manifest is retrievable and hashed', async () => {
  const server = await startServer();
  const port = server.address().port;
  const base = `http://localhost:${port}`;
  // add a record
  await fetch(`${base}/claims`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: '1' })
  });
  const res = await fetch(`${base}/export/manifests`, { method: 'POST' });
  const data = await res.json();
  const manifestRes = await fetch(`${base}${data.manifestUrl}`);
  const manifest = await manifestRes.json();
  const hash = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  assert.equal(hash, data.sha256);
  server.close();
});
