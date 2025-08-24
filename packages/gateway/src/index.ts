import express from 'express';
import http from 'http';
import { ApolloServer } from 'apollo-server-express';
import { Server as IOServer } from 'socket.io';
import schema from './graphql/schema';
import resolvers from './graphql/resolvers';

const app = express();
const httpServer = http.createServer(app);
const io = new IOServer(httpServer);

io.on('connection', () => {
  // placeholder for real-time events
});

const server = new ApolloServer({ typeDefs: schema, resolvers });
await server.start();
server.applyMiddleware({ app });

const port = process.env.PORT || 4000;
httpServer.listen(port, () => console.log(`Gateway running on ${port}`));
