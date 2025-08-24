import test from 'node:test';
import assert from 'node:assert/strict';
import { appendRecord, chain, app } from '../src/index.js';

// ensure chain links hashes correctly
test('appendRecord links hashes', () => {
  chain.length = 0;
  const a = appendRecord('claim', { id: '1', license: 'MIT', source: 'src' });
  const b = appendRecord('claim', { id: '2', license: 'MIT', source: 'src' });
  assert.equal(chain.length, 2);
  assert.equal(b.prevHash, a.hash);
});

// verify HTTP endpoints accept and store records
test('HTTP create and export', async () => {
  chain.length = 0;
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/claims`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: '3', license: 'Apache-2.0', source: 'test' })
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, '3');

  const exportRes = await fetch(`http://localhost:${port}/export/manifests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  assert.equal(exportRes.status, 200);
  const exportBody = await exportRes.json();
  assert.ok(exportBody.sha256);
  assert.equal(exportBody.manifest.records.length, 1);

  server.close();
});
