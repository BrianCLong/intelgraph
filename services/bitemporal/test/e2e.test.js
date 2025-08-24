const { test } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createApp } = require('../src/app');

test('reads at different times', async () => {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const checkpoints = [
    { asOfValid: '2020-01-01', asOfTx: '2020-01-01' },
    { asOfValid: '2020-06-01', asOfTx: '2020-06-01' },
    { asOfValid: '2021-01-01', asOfTx: '2021-01-01' }
  ];
  for (const cp of checkpoints) {
    const res = await fetch(`${base}/bt/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'RETURN 1', params: {}, ...cp })
    });
    const body = await res.json();
    assert.strictEqual(body.asOfValid, cp.asOfValid);
    assert.strictEqual(body.asOfTx, cp.asOfTx);
  }
  server.close();
});
