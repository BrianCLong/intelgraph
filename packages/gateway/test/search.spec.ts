import request from 'supertest';
import { createServer } from '../src';

jest.mock('node-fetch', () => jest.fn());
const fetchMock = require('node-fetch') as jest.Mock;

describe('gateway search', () => {
  it('returns search results', async () => {
    fetchMock.mockResolvedValue({
      json: async () => [
        {
          id: '1',
          type: 'Document',
          snippet: 'Alpha Org signed a contract.',
          score: 1,
          bm25: 1,
          vector: 1,
          graphBoost: 0,
          explanation: []
        }
      ]
    });
    const app = await createServer();
    const res = await request(app).post('/graphql').send({
      query: '{ search(query:"Alpha", k:5){ id } }'
    });
    expect(res.body.data.search[0].id).toBe('1');
  });
});
