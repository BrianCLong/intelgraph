import http from 'node:http';
import { StixTaxiiClient } from '../src/client.js';

describe('TAXII client contract', () => {
  let server: http.Server;
  let port = 0;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${port}`);
      const addedAfter = url.searchParams.get('added_after');
      res.setHeader('Content-Type', 'application/json');
      if (!addedAfter) {
        res.setHeader('X-TAXII-Date-Added-Last', '2025-01-01T00:00:01Z');
        res.end(JSON.stringify({ objects: [{ id: '1' }, { id: '2' }] }));
      } else {
        res.setHeader('X-TAXII-Date-Added-Last', addedAfter);
        res.end(JSON.stringify({ objects: [] }));
      }
    });
    server.listen(0, () => {
      const address = server.address();
      if (typeof address === 'object' && address) port = address.port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test('pulls items and provides cursor', async () => {
    const client = new StixTaxiiClient({ baseUrl: `http://localhost:${port}`, collection: 'test' });
    const first = await client.pull();
    expect(first.itemsIngested).toBe(2);
    expect(first.cursor).toBe('2025-01-01T00:00:01Z');
    const second = await client.pull(first.cursor);
    expect(second.itemsIngested).toBe(0);
  });
});
