import request from 'supertest';
const URL = process.env.GQL_URL || 'http://localhost:4000';

describe('Persisted-only', () => {
  it('rejects ad-hoc in prod', async () => {
    const res = await request(URL)
      .post('/graphql')
      .set('x-tenant', 'default')
      .send({ query: '{ __typename }' });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toMatch(/Persisted queries only/i);
  });
  it('accepts known persisted hash', async () => {
    const res = await request(URL)
      .post('/graphql')
      .set('x-tenant', 'default')
      .set('x-persisted-hash', 'sha256:abc123...')
      .send({ operationName: 'Ping', variables: {} });
    expect(res.status).toBe(200);
    expect(res.body.data).toBeTruthy();
  });
});
