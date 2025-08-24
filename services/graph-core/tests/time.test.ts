import request from 'supertest';
import app from '../src/index';

describe('time slice', () => {
  it('returns entity valid at time', async () => {
    const res = await request(app)
      .post('/api/v1/entities/Person')
      .send({
        id: 't1',
        attributes: { name: 'Bob' },
        validFrom: '2020-01-01T00:00:00.000Z',
        validTo: '2022-01-01T00:00:00.000Z'
      });
    expect(res.status).toBe(200);
    const q1 = await request(app)
      .post('/api/v1/query/cypher')
      .send({ id: 't1', time: '2021-06-01T00:00:00.000Z', cypher: 'MATCH (n) RETURN n' });
    expect(q1.body.entity.id).toBe('t1');
    const q2 = await request(app)
      .post('/api/v1/query/cypher')
      .send({ id: 't1', time: '2023-01-01T00:00:00.000Z', cypher: 'MATCH (n) RETURN n' });
    expect(q2.body.entity).toBeNull();
  });
});
