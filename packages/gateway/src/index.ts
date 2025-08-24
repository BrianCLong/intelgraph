import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { Server as SocketIOServer } from 'socket.io';
import { authMiddleware } from './security/auth.js';

const app = express();
app.use(cors());
app.use(helmet());
app.use(authMiddleware);

const apollo = new ApolloServer({ typeDefs, resolvers });
await apollo.start();
app.use('/graphql', express.json(), expressMiddleware(apollo));

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

io.on('connection', () => {
  console.log('socket connected');
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Gateway running on ${PORT}`);
});
