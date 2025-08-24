import request from 'supertest';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { typeDefs, resolvers } from './graphql/schema';

let app: express.Express;

beforeAll(async () => {
  app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
});

describe('GraphQL', () => {
  it('creates investigation', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({ query: 'mutation { createInvestigation(title:"A", sensitivity:"LOW"){ id title } }' });
    expect(res.body.data.createInvestigation.title).toBe('A');
  });
});
