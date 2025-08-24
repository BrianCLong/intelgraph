import express from 'express';
import cors from 'cors';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './graphql/schema';

async function start() {
  const app = express();
  app.use(cors());
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Gateway running at http://localhost:${port}${server.graphqlPath}`);
  });
}

start();
