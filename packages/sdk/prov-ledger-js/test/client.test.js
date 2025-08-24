import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../src/index.js';

test('client posts data', async () => {
  global.fetch = async (url, opts) => ({
    ok: true,
    json: async () => ({ url, opts })
  });
  const client = createClient('http://example');
  const res = await client.createClaim({ id: '1' });
  assert.equal(res.url, 'http://example/claims');
  assert.equal(res.opts.method, 'POST');
});

test('client gets manifest', async () => {
  global.fetch = async (url, opts) => ({
    ok: true,
    json: async () => ({ url, opts })
  });
  const client = createClient('http://example');
  const res = await client.getManifest('/export/manifests/1');
  assert.equal(res.url, 'http://example/export/manifests/1');
  assert.equal(res.opts, undefined);
});
