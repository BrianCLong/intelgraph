import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './graphql/schema';

async function start() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });
  app.listen({ port: 4000 }, () => {
    console.log('gateway running on http://localhost:4000' + server.graphqlPath);
  });
}

start();
