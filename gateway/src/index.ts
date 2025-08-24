import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway } from '@apollo/gateway';
import express from 'express';
import { makePersistedPlugin } from './plugins/persisted';
import { makeDepthCostPlugin } from './plugins/depthCost';
import { makeAbacPlugin } from './plugins/abac';
import { redactLogs } from './plugins/redactLogs';
import { buildContext } from './context';
import fs from 'node:fs';

export async function startGateway() {
  const gateway = new ApolloGateway({
    supergraphSdl: fs.readFileSync('supergraph/supergraph.graphql', 'utf8'),
  });

  const server = new ApolloServer({
    gateway,
    includeStacktraceInErrorResponses: false,
    plugins: [
      makePersistedPlugin({ storePath: 'ops/persisted.json' }),
      makeDepthCostPlugin({ maxDepth: 10, maxCost: 3000 }),
      makeAbacPlugin(),
      redactLogs(),
    ],
    introspection: process.env.NODE_ENV !== 'production',
  });

  const app = express();
  app.use('/graphql', express.json(), expressMiddleware(server, { context: buildContext }));
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  return { server, app };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startGateway();
}
