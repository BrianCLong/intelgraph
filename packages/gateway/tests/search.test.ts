import request from 'supertest';
import { createServer } from '../src/index';

jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

test('search query proxies to docsnlp', async () => {
  mockedFetch.mockResolvedValueOnce({
    json: async () => ({ hits: [{ documentId: '1', snippet: 'Alice' }] })
  } as any);
  const app = await createServer();
  const res = await request(app)
    .post('/graphql')
    .send({ query: '{ search(q: "Alice") { documentId } }' });
  expect(res.body.data.search[0].documentId).toBe('1');
});
