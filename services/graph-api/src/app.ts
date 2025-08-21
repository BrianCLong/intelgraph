import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { readFileSync } from 'fs';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import promClient from 'prom-client';
import neo4j from 'neo4j-driver';
import type { Driver } from 'neo4j-driver';
import { buildResolvers } from './resolvers';

const typeDefs = readFileSync(
  path.join(process.cwd(), 'src', 'schema.graphql'),
  'utf-8',
);

export async function createApp(existingDriver?: Driver) {
  const driver =
    existingDriver ||
    neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'test',
      ),
    );
  const resolvers = buildResolvers(driver);

  const app = express();
  app.use(helmet());
  app.use(cors());

  const registry = new promClient.Registry();
  promClient.collectDefaultMetrics({ register: registry });
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  });

  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'missing auth' });
    const token = auth.replace('Bearer ', '');
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'local-secret',
      ) as any;
      if (!payload.tenant)
        return res.status(403).json({ error: 'missing tenant' });
      (req as any).tenantId = payload.tenant;
      return next();
    } catch {
      return res.status(401).json({ error: 'invalid token' });
    }
  });

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ tenantId: (req as any).tenantId }),
  });
  await server.start();
  server.applyMiddleware({ app: app as any, path: '/graphql' });

  return { app, driver };
}

export async function start() {
  const { app } = await createApp();
  const port = process.env.PORT || 4000;
  return app.listen(port, () => {
    console.log(
      JSON.stringify({ level: 'info', msg: `server running on ${port}` }),
    );
  });
}
