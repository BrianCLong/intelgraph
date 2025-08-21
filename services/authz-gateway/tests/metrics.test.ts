import request from 'supertest';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';

describe('metrics', () => {
  afterAll(async () => {
    await stopObservability();
  });

  it('exposes prometheus metrics', async () => {
    const app = await createApp();
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });
});
