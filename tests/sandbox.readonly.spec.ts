import request from 'supertest';
import app from '../services/sandbox/src/index';

describe('sandbox RO', () => {
  it('blocks writes', async () => {
    const res = await request(app).post('/sandbox/run').send({ cypher: 'CREATE (n)' });
    expect(res.status).toBe(403);
  });
});
