import "dotenv/config";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { auditLogger } from "./middleware/audit-logger.js";
import monitoringRouter from "./routes/monitoring.js";
import aiRouter from "./routes/ai.js";
import nl2cypherRouter from "./routes/nl2cypher.js";
import { register } from "./monitoring/metrics.js";
import { typeDefs } from "./graphql/schema.js";
import resolvers from "./graphql/resolvers/index.js";
import { getContext } from "./lib/auth.js";
import { getNeo4jDriver } from "./db/neo4j.js";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken"; // Assuming jsonwebtoken is available or will be installed
import { Request, Response, NextFunction } from "express"; // Import types for middleware

export const createApp = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  const logger: pino.Logger = pino();
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
      credentials: true,
    }),
  );
  app.use(pinoHttp({ logger, redact: ["req.headers.authorization"] }));
  app.use(auditLogger);

  // Rate limiting (exempt monitoring endpoints)
  app.use("/monitoring", monitoringRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/nl2cypher", nl2cypherRouter);
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });
  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.RATE_LIMIT_MAX || 600),
      message: { error: "Too many requests, please try again later" },
    }),
  );

  app.get("/search/evidence", async (req, res) => {
    const { q, skip = 0, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).send({ error: "Query parameter 'q' is required" });
    }

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      const searchQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node, score
        RETURN node, score
        SKIP $skip
        LIMIT $limit
      `;

      const countQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node
        RETURN count(node) as total
      `;

      const [searchResult, countResult] = await Promise.all([
        session.run(searchQuery, {
          query: q,
          skip: Number(skip),
          limit: Number(limit),
        }),
        session.run(countQuery, { query: q }),
      ]);

      const evidence = searchResult.records.map((record) => ({
        node: record.get("node").properties,
        score: record.get("score"),
      }));

      const total = countResult.records[0].get("total").toNumber();

      res.send({
        data: evidence,
        metadata: {
          total,
          skip: Number(skip),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
          currentPage: Math.floor(Number(skip) / Number(limit)) + 1,
        },
      });
    } catch (error) {
      logger.error(
        `Error in search/evidence: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      res.status(500).send({ error: "Internal server error" });
    } finally {
      await session.close();
    }
  });

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // GraphQL over HTTP
  const { persistedQueriesPlugin } = await import(
    "./graphql/plugins/persistedQueries.js"
  );
  const { default: pbacPlugin } = await import("./graphql/plugins/pbac.js");
  const { default: resolverMetricsPlugin } = await import(
    "./graphql/plugins/resolverMetrics.js"
  );
  const { default: auditLoggerPlugin } = await import(
    "./graphql/plugins/auditLogger.js"
  );
  const { depthLimit } = await import("./graphql/validation/depthLimit.js");

  const apollo = new ApolloServer({
    schema,
    // Security plugins - Order matters for execution lifecycle
    plugins: [
      persistedQueriesPlugin as any,
      resolverMetricsPlugin as any,
      auditLoggerPlugin as any,
      // Enable PBAC in production
      ...(process.env.NODE_ENV === 'production' ? [pbacPlugin() as any] : [])
    ],
    // Security configuration based on environment
    introspection: process.env.NODE_ENV !== "production",
    // Enhanced query validation rules
    validationRules: [
      depthLimit(process.env.NODE_ENV === 'production' ? 6 : 8), // Stricter in prod
    ],
    // Security context
    formatError: (err) => {
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        logger.error(`GraphQL Error: ${err.message}`, { stack: err.stack });
        return new Error('Internal server error');
      }
      return err;
    },
  });
  await apollo.start();

  // Production Authentication - Use proper JWT validation
  const { productionAuthMiddleware, applyProductionSecurity, graphqlSecurityConfig } = await import('./config/production-security.js');
  
  // Apply security middleware based on environment
  if (process.env.NODE_ENV === 'production') {
    applyProductionSecurity(app);
  }
  
  const authenticateToken = process.env.NODE_ENV === 'production' 
    ? productionAuthMiddleware 
    : (req: Request, res: Response, next: NextFunction) => {
        // Development mode - relaxed auth for easier testing
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        
        if (!token) {
          console.warn("Development: No token provided, allowing request");
          (req as any).user = { sub: 'dev-user', email: 'dev@intelgraph.local', role: 'admin' };
        }
        next();
      };

  app.use(
    "/graphql",
    express.json(),
    authenticateToken, // WAR-GAMED SIMULATION - Add authentication middleware here
    expressMiddleware(apollo, { context: getContext }),
  );

  return app;
};
