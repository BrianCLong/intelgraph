import { start, app } from '../src/index';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import request from 'supertest';
import { createHash } from 'crypto';
import { startStandaloneServer } from '@apollo/server/standalone';

async function startSubgraph(port: number, typeDefs: string, resolvers: any) {
  const server = new ApolloServer({ schema: buildSubgraphSchema([{ typeDefs: gql(typeDefs), resolvers }]) });
  await startStandaloneServer(server, { listen: { port } });
}

beforeAll(async () => {
  await startSubgraph(4001, `
    type Account @key(fields: "id") { id: ID!, name: String }
    type Query { account(id: ID!): Account }
  `, {
    Query: { account: (_: any, { id }: any) => ({ id, name: `acct-${id}` }) },
  });
  await startSubgraph(4002, `
    type Product @key(fields: "id") { id: ID!, name: String }
    type Query { product(id: ID!): Product }
  `, {
    Query: { product: (_: any, { id }: any) => ({ id, name: `prod-${id}` }) },
  });
  await startSubgraph(4003, `
    type Review @key(fields: "id") { id: ID!, body: String }
    type Query { review(id: ID!): Review }
  `, {
    Query: { review: (_: any, { id }: any) => ({ id, body: `body-${id}` }) },
  });
  await start();
});

afterAll(async () => {
  // subgraphs are left running for test simplicity
});

test('federates across subgraphs', async () => {
  const query = `query GetData($id: ID!) {
    account(id: $id) { id name }
    product(id: $id) { id name }
    review(id: $id) { id body }
  }`;
  const hash = createHash('sha256').update(query).digest('hex');
  const res = await request(app)
    .post('/graphql')
    .send({
      query,
      variables: { id: '1' },
      extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
    })
    .expect(200);
  expect(res.body.data.account.name).toBe('acct-1');
  expect(res.body.data.product.name).toBe('prod-1');
  expect(res.body.data.review.body).toBe('body-1');
});

test('health endpoint aggregates subgraphs', async () => {
  const res = await request(app).get('/health/federation').expect(200);
  expect(res.body).toMatchObject({ accounts: true, products: true, reviews: true });
});
