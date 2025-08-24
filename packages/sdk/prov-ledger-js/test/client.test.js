import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../src/index.js';

test('client posts claim', async () => {
  global.fetch = async (url, opts) => ({
    ok: true,
    json: async () => ({ url, opts })
  });
  const client = createClient('http://example');
  const res = await client.createClaim({ id: '1', license: 'MIT', source: 'src' });
  assert.equal(res.url, 'http://example/claims');
  assert.equal(res.opts.method, 'POST');
});

test('client posts evidence and transform', async () => {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push(url);
    return { ok: true, json: async () => ({ url, opts }) };
  };
  const client = createClient('http://example');
  await client.createEvidence({ id: '2', license: 'MIT', source: 'src' });
  await client.createTransform({ id: '3', license: 'MIT', source: 'src' });
  assert.deepEqual(calls, ['http://example/evidence', 'http://example/transform']);
});

test('client exports manifest', async () => {
  global.fetch = async (url, opts) => ({
    ok: true,
    json: async () => ({ url, opts })
  });
  const client = createClient('http://example');
  const res = await client.exportManifest();
  assert.equal(res.url, 'http://example/export/manifests');
  assert.equal(res.opts.method, 'POST');
});
