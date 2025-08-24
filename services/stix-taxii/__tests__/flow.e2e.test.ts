import http from 'node:http';
import { StixTaxiiClient } from '../src/client.js';
import { normalizeIOC } from '../../packages/sdk/ioc-normalizer-js/src/index.js';

describe('pull → normalize flow', () => {
  let server: http.Server;
  let port = 0;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-TAXII-Date-Added-Last', '2025-01-01T00:00:01Z');
      res.end(
        JSON.stringify({
          objects: [
            {
              id: 'indicator--1',
              type: 'indicator',
              pattern: "[domain-name:value = 'Example.COM']"
            }
          ]
        })
      );
    });
    server.listen(0, () => {
      const address = server.address();
      if (typeof address === 'object' && address) port = address.port;
      done();
    });
  });

  afterAll((done) => server.close(done));

  test('normalizes pulled objects', async () => {
    const client = new StixTaxiiClient({ baseUrl: `http://localhost:${port}`, collection: 'test' });
    const res = await client.pull();
    const patterns = res.items.map((i) => /'([^']+)'/.exec(i.pattern)?.[1]).filter(Boolean) as string[];
    const normalized = patterns.map((p) => normalizeIOC(p));
    expect(normalized[0]?.key).toBe('domain:example.com');
  });
});
