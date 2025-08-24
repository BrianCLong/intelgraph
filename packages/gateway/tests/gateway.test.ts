import request from 'supertest';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { typeDefs, resolvers } from '../src/graphql/schema';

test('create and list scenes', async () => {
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: () => ({ user: { tenantId: 't1', roles: ['ADMIN'], userId: 'u1' } }),
  });
  await server.start();
  // @ts-ignore apply middleware type mismatch
  server.applyMiddleware({ app });
  const agent = request(app);
  const createRes = await agent
    .post('/graphql')
    .send({ query: 'mutation { createScene(title:"A") { id title } }' });
  expect(createRes.body.data.createScene.title).toBe('A');
  const listRes = await agent.post('/graphql').send({ query: '{ scenes { id title } }' });
  expect(listRes.body.data.scenes.length).toBe(1);
});
