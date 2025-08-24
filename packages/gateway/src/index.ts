import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import schema from './graphql/schema';

export async function createServer() {
  const app = express();
  const server = new ApolloServer({ schema });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  return app;
}

if (require.main === module) {
  createServer().then(app => {
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
      console.log(`Gateway listening on :${port}`);
    });
  });
}
