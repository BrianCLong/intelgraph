import request from 'supertest';
import app from '../src/index';

describe('entity upsert', () => {
  it('stores policy tags', async () => {
    const res = await request(app)
      .post('/api/v1/entities/Person')
      .send({ attributes: { name: 'Alice' }, policy: { origin: 'test' } });
    expect(res.status).toBe(200);
    expect(res.body.policy.origin).toBe('test');
    // idempotent
    const res2 = await request(app)
      .post(`/api/v1/entities/Person`)
      .send({ id: res.body.id, attributes: { name: 'Alice' }, policy: { origin: 'test2' } });
    expect(res2.body.id).toBe(res.body.id);
    expect(res2.body.policy.origin).toBe('test2');
  });
});
