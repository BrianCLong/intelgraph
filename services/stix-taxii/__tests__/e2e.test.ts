import request from 'supertest';
import http from 'node:http';
import { createApp } from '../src/app.js';

describe('STIX/TAXII service E2E', () => {
  const app = createApp();
  let server: http.Server;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  test('normalizes IOC via endpoint', async () => {
    const res = await request(server).post('/ioc/normalize').send({ ioc: 'Example.COM' });
    expect(res.status).toBe(200);
    expect(res.body.key).toBe('domain:example.com');
  });
});
