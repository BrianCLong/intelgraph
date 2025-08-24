import request from 'supertest';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import schema from '../src/graphql/schema';
import resolvers from '../src/graphql/resolvers';

const app = express();
const server = new ApolloServer({ typeDefs: schema, resolvers });

describe('GraphQL API', () => {
  it('creates hypothesis', async () => {
    await server.start();
    server.applyMiddleware({ app });
    const res = await request(app).post('/graphql').send({ query: 'mutation { createHypothesis(title:"X", prior:0.5){id title prior} }' });
    expect(res.body.data.createHypothesis.title).toBe('X');
  });
});
