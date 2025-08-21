import express from 'express';
import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import { SignJWT } from 'jose';
import { getPrivateKey } from '../src/keys';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

let opaServer: Server;
let upstreamServer: Server;

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

describe('security', () => {
  it('rejects tampered token', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token + 'tampered';
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA');
    expect(res.status).toBe(401);
  });

  it('rejects expired token', async () => {
    const app = await createApp();
    const token = await new SignJWT({
      sub: 'alice',
      tenantId: 'tenantA',
      roles: ['reader'],
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(getPrivateKey());
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA');
    expect(res.status).toBe(401);
  });

  it('prevents role escalation', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-needtoknow', 'admin');
    expect(res.status).toBe(403);
  });
});
