import { readFileSync } from 'fs';
import path from 'path';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';
import { createServer } from 'http';
import { IncomingHttpHeaders } from 'http';
// @ts-ignore - no types available
import depthLimit from 'graphql-depth-limit';
// @ts-ignore - no types available
import { createComplexityLimitRule } from 'graphql-validation-complexity';
import yaml from 'yaml';
import { trace } from '@opentelemetry/api';

const PORT = process.env.PORT || 4000;
const PERSISTED_ONLY = process.env.NODE_ENV === 'production' && process.env.ALLOW_PERSISTED === 'true' ? false : process.env.NODE_ENV === 'production';

const subgraphConfig = yaml.parse(readFileSync(path.join(process.cwd(), 'subgraphs.yaml')).toString());

class HeaderForwardingDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }: any) {
    const headers = context?.headers as IncomingHttpHeaders;
    const forwardHeaders = ['x-request-id', 'x-tenant-id', 'x-authority-id', 'traceparent'];
    forwardHeaders.forEach((h) => {
      const value = headers?.[h];
      if (value) {
        request.http?.headers.set(h, Array.isArray(value) ? value[0] : value);
      }
    });
  }
}

const gateway = new ApolloGateway({
  serviceList: Object.entries(subgraphConfig.subgraphs).map(([name, { url }]: any) => ({ name, url })),
  buildService({ url }) {
    return new HeaderForwardingDataSource({ url });
  },
});

export const server = new ApolloServer({
  gateway,
  validationRules: [
    depthLimit(10),
    createComplexityLimitRule(1000, {
      createError: (type: unknown) => new Error(`Query is too complex: ${type}`),
    }),
  ],
});

export const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => (req.headers['x-tenant-id'] ? 100 : 50),
  keyGenerator: (req) => String(req.headers['x-tenant-id'] || req.ip),
});

app.use(limiter);

const persistedQueries = new Map<string, string>();

app.get('/health/federation', async (_req, res) => {
  const results: Record<string, any> = {};
  await Promise.all(
    (gateway as any).serviceList.map(async (s: any) => {
      try {
        const r = await fetch(`${s.url.replace(/\/graphql$/, '')}/health`);
        results[s.name] = r.ok;
      } catch {
        results[s.name] = false;
      }
    })
  );
  res.json(results);
});

let started = false;
export async function start() {
  if (started) return;
  await server.start();
  app.use('/graphql', async (req, res, next) => {
    await express.json()(req, res, () => {});
    const hash = req.body?.extensions?.persistedQuery?.sha256Hash;
    const query = req.body?.query;
    if (hash && query) {
      persistedQueries.set(hash, query);
    } else if (hash && persistedQueries.has(hash)) {
      req.body.query = persistedQueries.get(hash);
    } else if (PERSISTED_ONLY) {
      res.status(400).json({ error: 'Persisted query required' });
      return;
    }
    const span = trace.getTracer('gateway').startSpan('request');
    res.on('finish', () => span.end());
    next();
  }, expressMiddleware(server, {
    context: async ({ req }) => ({ headers: req.headers }),
  }));
  const httpServer = createServer(app);
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, () => {
      console.log(`Gateway ready at http://localhost:${PORT}/graphql`);
      resolve();
    });
  });
  started = true;
}

if (process.env.NODE_ENV !== 'test') {
  start();
}
