import request from 'supertest';
import express from 'express';
import http from 'http';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from '../schema';

async function createApp() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  return http.createServer(app);
}

describe('graphql schema', () => {
  it('creates and lists cases', async () => {
    const httpServer = await createApp();
    await request(httpServer)
      .post('/graphql')
      .send({ query: 'mutation { createCase(input:{name:"A"}){id name}}' })
      .expect(200);

    const res = await request(httpServer)
      .post('/graphql')
      .send({ query: '{ cases { id name } }' })
      .expect(200);

    expect(res.body.data.cases[0].name).toBe('A');
  });
});
