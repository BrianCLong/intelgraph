import express from 'express';
import request from 'supertest';

jest.mock('../../middleware/auth', () => ({
  ensureAuthenticated: (_req: any, _res: any, next: any) => next(),
}));

const synthRouter = require('../synthRoutes');
const privacyRouter = require('../privacyRoutes');

describe('synthetic data routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/synth', synthRouter);
  app.use('/privacy', privacyRouter);

  it('trains model', async () => {
    const res = await request(app)
      .post('/synth/train')
      .send({ dataset: [], epsilon: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('modelId');
    expect(res.body.epsilon).toBe(1);
  });

  it('samples data', async () => {
    const res = await request(app)
      .post('/synth/sample')
      .send({ modelId: 'm1', count: 2 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('riskReport');
  });

  it('gets privacy report', async () => {
    const res = await request(app).get('/privacy/report/demo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('report');
    expect(res.body.report.dataset).toBe('demo');
  });
});
