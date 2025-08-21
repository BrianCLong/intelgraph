import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'rate-limiter-flexible';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { getNeo4jDriver } from './db/neo4j';
import { auditMiddleware } from './middleware/audit';
import { authenticateUser, authorizeOperation } from './middleware/auth';
import { ActiveMeasuresEngine } from './core/ActiveMeasuresEngine';
import { SimulationFramework } from './ai/SimulationFramework';
import { AnalyticsEngine } from './analytics/AnalyticsEngine';
import logger from './utils/logger';
import { setupMetrics } from './utils/metrics';
import { initializePostQuantumCrypto } from './security/pqc';
import { AirgapManager } from './security/airgap';

// Security and performance configurations
const rateLimiter = new rateLimit({
  keyIn: 'ip',
  pointsDecay: 60,
  points: 100, // 100 requests per minute
});

export class ActiveMeasuresServer {
  private app: express.Application;
  private server: any;
  private apolloServer: ApolloServer;
  private io: SocketIOServer;
  private activeMeasuresEngine: ActiveMeasuresEngine;
  private simulationFramework: SimulationFramework;
  private analyticsEngine: AnalyticsEngine;
  private airgapManager: AirgapManager;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.initializeServices();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    }));

    // Rate limiting
    this.app.use(async (req, res, next) => {
      try {
        await rateLimiter.consume(req.ip);
        next();
      } catch {
        res.status(429).json({ error: 'Rate limit exceeded' });
      }
    });

    // Request logging and metrics
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      });
      next();
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize core services
      const neo4jDriver = getNeo4jDriver();
      this.activeMeasuresEngine = new ActiveMeasuresEngine(neo4jDriver);
      this.simulationFramework = new SimulationFramework();
      this.analyticsEngine = new AnalyticsEngine(neo4jDriver);
      this.airgapManager = new AirgapManager();

      // Initialize Post-Quantum Cryptography
      await initializePostQuantumCrypto();

      // Setup Apollo Server
      this.apolloServer = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req }) => {
          const user = await authenticateUser(req);
          return {
            driver: neo4jDriver,
            user,
            activeMeasuresEngine: this.activeMeasuresEngine,
            simulationFramework: this.simulationFramework,
            analyticsEngine: this.analyticsEngine,
            airgapManager: this.airgapManager,
          };
        },
        plugins: [
          auditMiddleware,
          {
            requestDidStart() {
              return {
                willSendResponse(requestContext) {
                  // Log all GraphQL operations for audit
                  logger.info('GraphQL operation completed', {
                    operationName: requestContext.request.operationName,
                    query: requestContext.request.query,
                    variables: requestContext.request.variables,
                    user: requestContext.context.user?.id,
                  });
                },
              };
            },
          },
        ],
        introspection: process.env.NODE_ENV !== 'production',
        playground: process.env.NODE_ENV !== 'production',
      });

      await this.apolloServer.start();
      this.apolloServer.applyMiddleware({ app: this.app, path: '/graphql' });

      logger.info('Active Measures services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services', { error: error.message });
      throw error;
    }
  }

  private setupSocketIO(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const user = await authenticateUser({ headers: { authorization: `Bearer ${token}` } });
        socket.data.user = user;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('User connected to Active Measures', { userId: socket.data.user?.id });

      socket.on('join-operation', (operationId) => {
        socket.join(`operation:${operationId}`);
        logger.info('User joined operation room', {
          userId: socket.data.user?.id,
          operationId,
        });
      });

      socket.on('simulation-update', (data) => {
        socket.to(`operation:${data.operationId}`).emit('simulation-progress', data);
      });

      socket.on('disconnect', () => {
        logger.info('User disconnected from Active Measures', {
          userId: socket.data.user?.id,
        });
      });
    });
  }

  public async start(port: number = 4000): Promise<void> {
    try {
      this.server = createServer(this.app);
      this.setupSocketIO();
      setupMetrics(this.app);

      // Health check endpoint
      this.app.get('/health', async (req, res) => {
        try {
          const neo4jDriver = getNeo4jDriver();
          await neo4jDriver.verifyConnectivity();
          res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
              neo4j: 'connected',
              apollo: 'running',
              socketio: 'running',
              airgap: this.airgapManager.isActive() ? 'active' : 'inactive',
            },
          });
        } catch (error) {
          res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Metrics endpoint
      this.app.get('/metrics', (req, res) => {
        res.set('Content-Type', 'text/plain');
        res.send('# Active Measures Module Metrics\n# Implementation pending');
      });

      await new Promise<void>((resolve) => {
        this.server.listen(port, () => {
          logger.info(`🚀 Active Measures Server ready at http://localhost:${port}`);
          logger.info(`🔍 GraphQL endpoint: http://localhost:${port}/graphql`);
          logger.info(`🔗 Socket.IO endpoint: ws://localhost:${port}`);
          resolve();
        });
      });
    } catch (error) {
      logger.error('Failed to start Active Measures server', { error: error.message });
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      if (this.io) {
        this.io.close();
      }
      if (this.apolloServer) {
        await this.apolloServer.stop();
      }
      if (this.server) {
        this.server.close();
      }
      logger.info('Active Measures server stopped gracefully');
    } catch (error) {
      logger.error('Error stopping Active Measures server', { error: error.message });
      throw error;
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new ActiveMeasuresServer();
  const port = parseInt(process.env.PORT || '4000', 10);

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  server.start(port).catch((error) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });
}

export default ActiveMeasuresServer;