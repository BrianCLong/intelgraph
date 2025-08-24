import request from 'supertest';
import app from '../src/index';

describe('entity resolution', () => {
  it('scores fuzzy name + email highly with weights', async () => {
    const a = { id: '1', type: 'Person', attributes: { name: 'Alice', email: 'a@example.com' } };
    const b = { id: '2', type: 'Person', attributes: { name: 'Alicia', email: 'a@example.com' } };
    const res = await request(app)
      .post('/api/v1/er/candidates')
      .send({ entities: [a, b] });
    expect(res.status).toBe(200);
    expect(res.body.score).toBeGreaterThan(0.75);
    expect(res.body.weights.name).toBe(0.6);
    const exp = await request(app).get(`/api/v1/er/explanations/${res.body.id}`);
    expect(exp.body.breakdown.name).toBeGreaterThan(0);
  });

  it('scores name-only match low and exposes queue', async () => {
    const a = { id: '3', type: 'Person', attributes: { name: 'Bob' } };
    const b = { id: '4', type: 'Person', attributes: { name: 'Bobby' } };
    const res = await request(app)
      .post('/api/v1/er/candidates')
      .send({ entities: [a, b] });
    expect(res.body.score).toBeLessThan(0.7);
    const queue = await request(app).get('/api/v1/er/candidates');
    expect(queue.body.find((c: any) => c.id === res.body.id)).toBeTruthy();
  });
});
