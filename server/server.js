const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { ApolloServer } = require('apollo-server-express');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const net = require('net');
const path = require('path');

require('dotenv').config();
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { 
  connectNeo4j, 
  connectPostgres, 
  connectRedis,
  closeConnections 
} = require('./src/config/database');

const { typeDefs } = require('./src/graphql/schema');
const resolvers = require('./src/graphql/resolvers');
const AuthService = require('./src/services/AuthService');
const { ensureAuthenticated } = require('./src/middleware/auth');

    const { initSocket } = require('./src/realtime/socket');
    const { startAIWorker } = require('./src/workers/aiWorker');
    const { startEmbeddingWorker } = require('./src/workers/embeddingWorker');
const { setIO } = require('./src/copilot/orchestrator');
const { AnalyticsBridge } = require('./src/realtime/analyticsBridge');
const tracingService = require('./src/monitoring/tracing');

// Utility function to find an available port
async function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        if (startPort >= 5000) {
          reject(new Error(`No available ports found in range ${config.port}-5000`));
        } else {
          findAvailablePort(startPort + 1).then(resolve).catch(reject);
        }
      } else {
        reject(err);
      }
    });
  });
}

async function startServer() {
  try {
    const app = express();
    app.disable('x-powered-by');
    const httpServer = createServer(app);
    
    const io = initSocket(httpServer); // Initialize Socket.IO (with /realtime)
    setIO(io); // Pass Socket.IO instance to orchestrator
    startAIWorker(); // start BullMQ AI worker
    startEmbeddingWorker(); // background embeddings writer (feature-flagged)
    const bridge = new AnalyticsBridge(io); // analytics namespace + consumer
    bridge.start();

    logger.info('🔗 Connecting to databases...');
    await connectNeo4j();
    await connectPostgres();
    await connectRedis();
    logger.info('✅ All databases connected');

    // Enhanced security configuration
    const isProduction = config.env === 'production';
    const isDevelopment = config.env === 'development';
    
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", ...(isDevelopment ? ["'unsafe-eval'"] : [])],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:", ...(isDevelopment ? ["*"] : [])],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          childSrc: ["'none'"],
          workerSrc: ["'self'"],
          manifestSrc: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null
        }
      },
      crossOriginEmbedderPolicy: isProduction,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: isProduction ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      } : false,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    }));
    
    // CORS configuration with environment-specific settings
    const corsOptions = {
      origin: (origin, callback) => {
        if (isDevelopment) {
          // Allow any origin in development
          callback(null, true);
        } else {
          // Production: only allow configured origins
          const allowedOrigins = Array.isArray(config.cors.origin) 
            ? config.cors.origin 
            : [config.cors.origin];
          
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-*'],
      maxAge: isProduction ? 86400 : 0, // 24 hours in production
      preflightContinue: false,
      optionsSuccessStatus: 204
    };
    
    app.use(cors(corsOptions));
    
    // Enhanced rate limiting
    const generalLimiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        error: 'Too many requests from this IP address',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP address',
          retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
        });
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
      }
    });
    
    // Stricter rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: isProduction ? 5 : 50, // 5 attempts in production, 50 in dev
      message: {
        error: 'Too many authentication attempts',
        retryAfter: 15 * 60
      },
      skipSuccessfulRequests: true
    });
    
    app.use(generalLimiter);
    app.use('/api/auth', authLimiter);
    app.use('/graphql', rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: isProduction ? 100 : 1000 // GraphQL queries can be more frequent
    }));
    
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Add tracing middleware
    app.use(tracingService.expressMiddleware());
    
    app.use(morgan('combined', { 
      stream: { write: message => logger.info(message.trim()) }
    }));
    
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.env,
        version: '1.0.0',
        services: {
          neo4j: 'connected',
          postgres: 'connected',
          redis: 'connected'
        },
        features: {
          ai_analysis: 'enabled',
          real_time: 'enabled',
          authentication: 'enabled'
        }
      });
    });

    // Enforce authentication across API and GraphQL routes
    app.use('/graphql', ensureAuthenticated);
    app.use('/api', ensureAuthenticated);

    // API Routes
    app.use('/api/graphrag', require('./src/routes/graphragRoutes'));
    app.use('/api/connector', require('./src/routes/connectorRoutes'));
    app.use('/api/tracing', require('./src/routes/tracingRoutes'));
    app.use('/api/monitoring', require('./src/routes/monitoring'));
    app.use('/api/export', require('./src/routes/export'));
    app.use('/api/activity', require('./src/routes/activity'));
    app.use('/api/admin', require('./src/routes/admin'));
    app.use('/api/import', require('./src/routes/import'));
    app.use('/api/nlq', require('./src/routes/nlq'));
    app.use('/api/templates', require('./src/routes/templateRoutes'));

    // Webhook endpoint to ingest completed GNN suggestions (production-safe)
    app.post('/api/ai/gnn/suggestions', async (req, res) => {
      try {
        // Optional simple token check
        const apiKey = req.get('X-API-Key') || req.query.key;
        if (process.env.AI_WEBHOOK_KEY && apiKey !== process.env.AI_WEBHOOK_KEY) {
          return res.status(401).json({ ok: false, error: 'Unauthorized' });
        }
        const { entityId, recommendations } = req.body || {};
        if (!entityId || !Array.isArray(recommendations)) {
          return res.status(400).json({ ok: false, error: 'Invalid payload' });
        }
        const { getRedisClient } = require('./src/config/database');
        const redis = getRedisClient();
        const { publishAISuggestions } = require('./src/graphql/resolvers.ai');
        const limit = recommendations.length || 5;
        const cacheKey = `ai:suggest:${entityId}:${limit}`;
        if (redis) {
          try { await redis.set(cacheKey, JSON.stringify(recommendations), 'EX', 300); } catch (_) {}
        }
        await publishAISuggestions(entityId, recommendations);
        return res.json({ ok: true });
      } catch (e) {
        logger.error('Webhook /api/ai/gnn/suggestions failed', e);
        return res.status(500).json({ ok: false });
      }
    });

    // Dev-only endpoints to facilitate E2E and UI testing (guarded by DEV_FEATURE_ROUTES)
    if (config.env !== 'production' && process.env.DEV_FEATURE_ROUTES !== '0') {
      app.post('/dev/ai-insight', (req, res) => {
        try {
          const payload = req.body || {};
          io.emit('ai:insight', payload);
          res.json({ ok: true });
        } catch (e) {
          res.status(500).json({ ok: false, error: e.message });
        }
      });

      app.get('/dev/relationship/:id', (req, res) => {
        const id = req.params.id;
        res.json({
          id,
          type: 'ASSOCIATED_WITH',
          label: 'Associated With',
          properties: { confidence: 0.87, since: '2023-05-01' },
          source: { id: 'n1', label: 'Source' },
          target: { id: 'n2', label: 'Target' }
        });
      });

      // Webhook to ingest GNN suggestions -> publish GraphQL subscription + cache
      app.post('/webhooks/gnn/suggestions', async (req, res) => {
        try {
          const { entityId, recommendations } = req.body || {};
          if (!entityId || !Array.isArray(recommendations)) {
            return res.status(400).json({ ok: false, error: 'Invalid payload' });
          }
          const { getRedisClient } = require('./src/config/database');
          const redis = getRedisClient();
          const { publishAISuggestions } = require('./src/graphql/resolvers.ai');
          const limit = recommendations.length || 5;
          const cacheKey = `ai:suggest:${entityId}:${limit}`;
          if (redis) {
            try { await redis.set(cacheKey, JSON.stringify(recommendations), 'EX', 300); } catch (_) {}
          }
          await publishAISuggestions(entityId, recommendations);
          return res.json({ ok: true });
        } catch (e) {
          logger.error('Webhook /webhooks/gnn/suggestions failed', e);
          return res.status(500).json({ ok: false });
        }
      });
    }
    
    const { depthLimit } = require('./src/graphql/validation/depthLimit');
    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      validationRules: [depthLimit(Number(process.env.GRAPHQL_MAX_DEPTH) || 10)],
      context: async ({ req, connection }) => {
        if (connection) {
          return connection.context;
        }
        
        const token = req.headers.authorization?.replace('Bearer ', '');
        let user = null;
        
        if (token) {
          const authService = new AuthService();
          user = await authService.verifyToken(token);
        }
        const sessionId = req.headers['x-session-id'] || crypto.randomUUID();
        const clientIp = req.ip;
        const userAgent = req.get('User-Agent');
        req.sessionId = sessionId;
        return {
          user,
          req,
          logger,
          sessionId,
          clientIp,
          userAgent,
        };
      },
      subscriptions: {
        onConnect: async (connectionParams) => {
          const token = connectionParams.authorization?.replace('Bearer ', '');
          let user = null;
          
          if (token) {
            const authService = new AuthService();
            user = await authService.verifyToken(token);
          }
          
          return { user };
        }
      },
      const realtimeMutationsPlugin = require('./src/graphql/plugins/realtimeMutations');

// ... inside startServer function ...

    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      validationRules: [depthLimit(Number(process.env.GRAPHQL_MAX_DEPTH) || 10)],
      context: async ({ req, connection }) => {
        if (connection) {
          return connection.context;
        }
        
        const token = req.headers.authorization?.replace('Bearer ', '');
        let user = null;
        
        if (token) {
          const authService = new AuthService();
          user = await authService.verifyToken(token);
        }
        const sessionId = req.headers['x-session-id'] || crypto.randomUUID();
        const clientIp = req.ip;
        const userAgent = req.get('User-Agent');
        req.sessionId = sessionId;
        return {
          user,
          req,
          logger,
          sessionId,
          clientIp,
          userAgent,
        };
      },
      subscriptions: {
        onConnect: async (connectionParams) => {
          const token = connectionParams.authorization?.replace('Bearer ', '');
          let user = null;
          
          if (token) {
            const authService = new AuthService();
            user = await authService.verifyToken(token);
          }
          
          return { user };
        }
      },
      plugins: [
        pbacPlugin(),
        realtimeMutationsPlugin(), // Add the new plugin here
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                logger.info(`GraphQL Operation: ${requestContext.request.operationName}`);
              },
              didEncounterErrors(requestContext) {
                logger.error('GraphQL Error:', requestContext.errors);
              }
            };
          }
        }
      ]
    });
    });
    
    await apolloServer.start();
    apolloServer.applyMiddleware({ 
      app, 
      path: '/graphql',
      cors: false
    });

    // Optional GraphQL WS server using graphql-ws if available
    try {
      // Dynamically import to avoid hard dependency if not installed
      const { useServer } = require('graphql-ws/lib/use/ws');
      const { WebSocketServer } = require('ws');
      const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
      });
      useServer({
        schema: apolloServer.schema,
        context: async (ctx) => {
          const token = (ctx.connectionParams && ctx.connectionParams.authorization)
            ? String(ctx.connectionParams.authorization).replace('Bearer ', '')
            : '';
          let user = null;
          if (token) {
            const authService = new AuthService();
            user = await authService.verifyToken(token).catch(() => null);
          }
          return { user, logger };
        },
      }, wsServer);
      logger.info('🔌 graphql-ws server initialized on /graphql');
    } catch (e) {
      logger.warn('graphql-ws not installed; GraphQL subscriptions over WS disabled');
    }

    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      socket.on('join_investigation', (investigationId) => {
        socket.join(`investigation_${investigationId}`);
        logger.info(`Client ${socket.id} joined investigation ${investigationId}`);
      });
      
      socket.on('leave_investigation', (investigationId) => {
        socket.leave(`investigation_${investigationId}`);
        logger.info(`Client ${socket.id} left investigation ${investigationId}`);
      });
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    if (config.env === 'production') {
      const clientDistPath = path.resolve(__dirname, '../client/dist');
      app.use(express.static(clientDistPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      });
    }

    app.use((err, req, res, next) => {
      logger.error(`Unhandled error: ${err.message}`, err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: config.env === 'development' ? err.message : 'Something went wrong'
      });
    });

    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
    
    const PORT = await findAvailablePort(config.port);
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 IntelGraph AI Server running on port ${PORT}`);
      logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      logger.info(`🔌 WebSocket subscriptions ${(() => {
        try { require.resolve('graphql-ws'); return 'available'; } catch { return 'disabled'; }
      })()}`);
      logger.info(`🌍 Environment: ${config.env}`);
      logger.info(`🤖 AI features enabled`);
      logger.info(`🛡️  Security features enabled`);
      logger.info(`📈 Real-time updates enabled`);
    });

    httpServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use. Please stop the existing process or choose a different port.`);
        logger.error('To find processes using the port, run: lsof -i :' + PORT);
        logger.error('To kill the process, run: kill -9 <PID>');
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });
    
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await apolloServer.stop();
      await closeConnections();
      httpServer.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`, error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection:`, reason);
  process.exit(1);
});

startServer();
