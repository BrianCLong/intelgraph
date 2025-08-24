import request from 'supertest';
import { createApp } from '../src/appFactory';

describe('SDK Routes', () => {
  it('GET /sdk/health returns ok', async () => {
    const app = createApp({ lightweight: true });
    const res = await request(app).get('/sdk/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /sdk/publish accepts valid payload', async () => {
    const app = createApp({ lightweight: true });
    const res = await request(app)
      .post('/sdk/publish')
      .send({ language: 'ts', version: '1.0.0' })
      .expect(202);
    expect(res.body).toMatchObject({
      message: 'SDK publish request accepted',
      language: 'ts',
      version: '1.0.0',
    });
  });

  it('POST /sdk/publish requires language and version', async () => {
    const app = createApp({ lightweight: true });
    const res = await request(app).post('/sdk/publish').send({}).expect(400);
    expect(res.body).toHaveProperty('error');
  });
});
