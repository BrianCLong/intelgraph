import express from 'express';
import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import type { AddressInfo } from 'net';

describe('token lifecycle', () => {
  afterAll(async () => {
    await stopObservability();
  });
  it('logs in and introspects', async () => {
    process.env.OPA_URL = 'http://localhost:8181/v1/data/authz/allow'; // unused in this test
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;
    const introspectRes = await request(app)
      .post('/auth/introspect')
      .send({ token });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.sub).toBe('alice');
  });

  it('serves JWKS', async () => {
    const app = await createApp();
    const res = await request(app).get('/.well-known/jwks.json');
    expect(res.status).toBe(200);
    expect(res.body.keys[0].kty).toBe('RSA');
  });

  it('rejects invalid introspection token', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/auth/introspect')
      .send({ token: 'bad' });
    expect(res.status).toBe(401);
  });

  it('performs step-up authentication', async () => {
    const opa = express();
    opa.use(express.json());
    opa.post('/v1/data/authz/allow', (_req, res) => res.json({ result: true }));
    const opaServer = opa.listen(0);
    const opaPort = (opaServer.address() as AddressInfo).port;
    process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/authz/allow`;
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const step = await request(app)
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${token}`);
    expect(step.status).toBe(200);
    const introspectRes = await request(app)
      .post('/auth/introspect')
      .send({ token: step.body.token });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.acr).toBe('loa2');
    opaServer.close();
  });
});
