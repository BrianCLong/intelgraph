import request from 'supertest';
import { createServer } from '../../index';

describe('tenants query', () => {
  it('returns seeded tenants', async () => {
    const app = await createServer();
    const res = await request(app)
      .post('/graphql')
      .send({ query: '{ tenants { id name } }' });
    expect(res.status).toBe(200);
    expect(res.body.data.tenants).toHaveLength(2);
  });
});
