import request from 'supertest';
import express from 'express';

jest.mock('../../featureFlags/flagsmith', () => ({
  isEnabled: jest.fn(),
}));

import refineryRouter from '../refinery';
import { isEnabled } from '../../featureFlags/flagsmith';

const app = express();
app.use(express.json());
app.use(refineryRouter);

describe('Refinery routes', () => {
  beforeEach(() => {
    (isEnabled as jest.Mock).mockResolvedValue(false);
  });

  it('returns advisory plan', async () => {
    const res = await request(app).post('/advisor/plan').send({ query: 'SELECT 1' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('viewSpec');
    expect(res.body).toHaveProperty('costDelta');
    expect(res.body).toHaveProperty('ROI');
  });

  it('honors feature flag for create', async () => {
    const res = await request(app).post('/views/demo/create');
    expect(isEnabled).toHaveBeenCalledWith('refinery.auto');
    expect(res.status).toBe(202);
    expect(res.body.status).toBe('advisory-only');
  });

  it('creates view when flag enabled', async () => {
    (isEnabled as jest.Mock).mockResolvedValueOnce(true);
    const res = await request(app).post('/views/demo/create');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('created');
  });

  it('returns health metrics', async () => {
    const res = await request(app).get('/views/demo/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('lag');
    expect(res.body).toHaveProperty('hitRate');
  });
});
