import { ApolloServer } from 'apollo-server';
import pino from 'pino';
import { typeDefs, resolvers } from './graphql/schema';

const logger = pino();

export async function createServer() {
  const server = new ApolloServer({ typeDefs, resolvers });
  return server;
}

if (require.main === module) {
  createServer()
    .then((server) => server.listen({ port: 4000 }))
    .then(({ url }) => logger.info(`gateway ready at ${url}`))
    .catch((err) => {
      logger.error(err);
      process.exit(1);
    });
}
