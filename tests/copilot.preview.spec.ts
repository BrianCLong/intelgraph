import request from 'supertest';
import app from '../services/copilot/src/index';

describe('copilot preview', () => {
  it('rejects short prompt', async () => {
    const res = await request(app).post('/copilot/preview').send({ prompt: 'hi' });
    expect(res.status).toBe(400);
  });
  it('returns cypher + estimate', async () => {
    const res = await request(app).post('/copilot/preview').send({ prompt: 'Find connections between A and B' });
    expect(res.status).toBe(200);
    expect(res.body.cypher).toContain('MATCH');
    expect(res.body.estimate).toHaveProperty('rows');
  });
});
