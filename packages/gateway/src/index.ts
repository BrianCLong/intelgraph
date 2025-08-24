import type { Application } from "express";
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './graphql/schema';

export async function createServer() {
  const app: Application = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });
  return app;
}

if (require.main === module) {
  createServer().then(app => {
    const port = process.env.PORT || 4000;
    app.listen(port, () => console.log(`gateway listening on ${port}`));
  });
}
