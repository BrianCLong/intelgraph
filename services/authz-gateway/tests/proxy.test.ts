import express from 'express';
import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

let upstreamServer: Server;
let opaServer: Server;

beforeAll((done) => {
  const upstream = express();
  upstream.get('/resource', (_req, res) => res.json({ data: 'ok' }));
  upstreamServer = upstream.listen(0, () => {
    const port = (upstreamServer.address() as AddressInfo).port;
    process.env.UPSTREAM = `http://localhost:${port}`;
    const opa = express();
    opa.use(express.json());
    opa.post('/v1/data/authz/allow', (req, res) => {
      const { user, resource } = req.body.input;
      if (user.tenantId !== resource.tenantId) {
        return res.json({ result: false });
      }
      if (resource.needToKnow && !user.roles.includes(resource.needToKnow)) {
        return res.json({ result: false });
      }
      return res.json({ result: true });
    });
    opaServer = opa.listen(0, () => {
      const opaPort = (opaServer.address() as AddressInfo).port;
      process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/authz/allow`;
      done();
    });
  });
});

afterAll(async () => {
  upstreamServer.close();
  opaServer.close();
  await stopObservability();
});

describe('proxy', () => {
  it('allows same-tenant access', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA');
    expect(res.status).toBe(200);
    expect(res.body.data).toBe('ok');
  });

  it('blocks cross-tenant access', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantB');
    expect(res.status).toBe(403);
  });
});
