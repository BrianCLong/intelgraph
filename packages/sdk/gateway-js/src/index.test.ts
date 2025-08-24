import express from 'express';
import { createHash } from 'crypto';
import { GatewayClient } from './index';
import bodyParser from 'body-parser';

let server: any;

beforeAll((done) => {
  const app = express();
  app.use(bodyParser.json());
  app.post('/graphql', (req, res) => {
    const { query, extensions } = req.body;
    if (!extensions?.persistedQuery) {
      return res.status(400).json({ error: 'no persisted query' });
    }
    const hash = createHash('sha256').update(query).digest('hex');
    if (hash !== extensions.persistedQuery.sha256Hash) {
      return res.status(400).json({ error: 'hash mismatch' });
    }
    res.json({ data: { ok: true } });
  });
  server = app.listen(5001, done);
});

afterAll((done) => {
  server.close(done);
});

test('executes persisted query', async () => {
  const client = new GatewayClient({
    url: 'http://localhost:5001/graphql',
    queries: { Test: '{ ok }' },
  });
  const data = await client.query<{ ok: boolean }>('Test');
  expect(data.ok).toBe(true);
});
