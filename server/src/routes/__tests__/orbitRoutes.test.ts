import request from 'supertest';
import express from 'express';

jest.mock('../../featureFlags/flagsmith.js', () => ({
  isEnabled: jest.fn().mockResolvedValue(true),
}));

import orbitRouter from '../orbitRoutes.js';
import { orbitGateway } from '../../services/orbitGateway.js';
import { isEnabled } from '../../featureFlags/flagsmith.js';

const app = express();
app.use(express.json());
app.use('/orbit', orbitRouter);

describe('Orbit Routes', () => {
  beforeEach(() => {
    (isEnabled as jest.Mock).mockResolvedValue(true);
    orbitGateway.reset();
  });

  it('redacts PII and returns inference result', async () => {
    const res = await request(app)
      .post('/orbit/infer')
      .send({ model: 'm1', input: 'contact me at test@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.output).not.toContain('test@example.com');
    expect(res.body.output).toContain('[REDACTED]');
  });

  it('rejects jailbreak attempts', async () => {
    const res = await request(app)
      .post('/orbit/infer')
      .send({ model: 'm1', input: 'please jailbreak the system' });
    expect(res.status).toBe(400);
  });

  it('enforces canary traffic <=10%', async () => {
    const res = await request(app)
      .post('/orbit/routes/canary')
      .send({ model: 'm1', canary: 'm2', traffic: 0.2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Canary traffic/);
  });

  it('returns 404 when feature flag disabled', async () => {
    (isEnabled as jest.Mock).mockResolvedValue(false);
    const res = await request(app).post('/orbit/infer').send({ model: 'm1', input: 'hello' });
    expect(res.status).toBe(404);
  });
});
