import request from 'supertest';
import { createServer } from '../src';

describe('gateway schema', () => {
  it('returns raw entities', async () => {
    const app = await createServer();
    const res = await request(app)
      .post('/graphql')
      .send({ query: '{ rawEntities { id names } }' });
    expect(res.body.data.rawEntities.length).toBeGreaterThan(0);
  });
});
