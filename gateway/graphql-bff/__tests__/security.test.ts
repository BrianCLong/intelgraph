import { start, app } from '../src/index';
import request from 'supertest';
import { createHash } from 'crypto';

beforeAll(async () => {
  await start();
});

test('rejects spoofed query hash', async () => {
  const query = 'query A { __typename }';
  const hash = createHash('sha256').update(query).digest('hex');
  await request(app)
    .post('/graphql')
    .send({
      query: 'query B { __typename }',
      extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
    })
    .expect(400);
});

test('rejects overly deep query', async () => {
  const query = 'query Deep { a { b { c { d { e { f } } } } } }';
  const hash = createHash('sha256').update(query).digest('hex');
  const res = await request(app)
    .post('/graphql')
    .send({ query, extensions: { persistedQuery: { version: 1, sha256Hash: hash } } });
  expect(res.status).toBe(400);
});
