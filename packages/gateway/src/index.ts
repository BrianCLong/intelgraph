import express from 'express';
import http from 'http';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './schema';
import { z } from 'zod';
import { Server as IOServer } from 'socket.io';

async function main() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new IOServer(httpServer, { cors: { origin: '*' } });
  io.on('connection', () => {
    // presence events could be handled here
  });

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  httpServer.listen(4000, () => {
    console.log('gateway running on 4000');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
