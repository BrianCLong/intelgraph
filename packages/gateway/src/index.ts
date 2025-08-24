import express, { Application } from 'express';
import http from 'http';
import { ApolloServer } from 'apollo-server-express';
import { Server as SocketIOServer } from 'socket.io';
import pino from 'pino';
import schema from './graphql/schema';
import createResolvers, { FinintelClient } from './graphql/resolvers';

export async function createApp(client: FinintelClient): Promise<Application> {
  const app: Application = express();
  const apollo = new ApolloServer({ typeDefs: schema, resolvers: createResolvers(client) });
  await apollo.start();
  apollo.applyMiddleware({ app: app as any });
  return app;
}

export async function startServer(client: FinintelClient, port = 4000) {
  const app = await createApp(client);
  const server = http.createServer(app);
  const io = new SocketIOServer(server);
  const log = pino();
  io.on('connection', () => log.info('socket connected'));
  server.listen(port, () => log.info(`gateway listening on ${port}`));
}
