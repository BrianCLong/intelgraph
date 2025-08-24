import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

export async function createServer() {
  const app = express();
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  apollo.applyMiddleware({ app, path: '/graphql' });
  return app;
}

if (require.main === module) {
  createServer().then(app => {
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`Gateway running at http://localhost:${port}/graphql`);
    });
  });
}
