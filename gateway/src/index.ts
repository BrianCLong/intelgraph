import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import fs from 'fs';
import path from 'path';
import { resolvers } from './resolvers';
import { logger } from './logger';

const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8');

export async function createApp() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use('/graphql', expressMiddleware(server));
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  createApp().then(app => {
    const port = process.env.PORT || 4000;
    app.listen(port, () => logger.info({ port }, 'gateway listening'));
  });
}
