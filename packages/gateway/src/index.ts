import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import typeDefs from './graphql/schema';
import resolvers from './graphql/resolvers';

async function start() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`gateway listening on ${port}`);
  });
}

start();
