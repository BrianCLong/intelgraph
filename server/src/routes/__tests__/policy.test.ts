import request from 'supertest';
import express from 'express';
import policyRouter from '../policyRoutes';

const app = express();
app.use(express.json());
app.use('/policy', policyRouter);

describe('Policy Routes', () => {
  it('returns allowed for default policy evaluation', async () => {
    const res = await request(app)
      .post('/policy/check')
      .send({ action: 'read', resource: 'document' });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
    expect(res.body.reason).toBe('Policy engine not yet integrated');
  });

  it('returns 400 when action or resource missing', async () => {
    const res = await request(app).post('/policy/check').send({ action: 'read' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing 'action' or 'resource'");
  });
});
