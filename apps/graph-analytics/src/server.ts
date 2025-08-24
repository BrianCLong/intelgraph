import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import { createClient } from 'redis';
import { GraphAnalyticsService } from './services/GraphAnalyticsService';
import { NetworkVisualizationService } from './services/NetworkVisualizationService';
import { logger } from './utils/logger';
import { config } from './config';
import { authenticate, authorize } from './middleware/auth';

const app = express();
const PORT = config.server.port || 4006;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.server.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // More restrictive for compute-intensive operations
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'graph-analytics',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Database connections
let pgPool: Pool;
let neo4jDriver: neo4j.Driver;
let redisClient: any;
let graphAnalyticsService: GraphAnalyticsService;
let networkVisualizationService: NetworkVisualizationService;

async function initializeServices() {
  try {
    // PostgreSQL connection
    pgPool = new Pool({
      host: config.database.postgres.host,
      port: config.database.postgres.port,
      user: config.database.postgres.user,
      password: config.database.postgres.password,
      database: config.database.postgres.database,
      ssl: config.database.postgres.ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    // Test PostgreSQL connection
    await pgPool.query('SELECT NOW()');
    logger.info('PostgreSQL connected successfully');

    // Neo4j connection
    neo4jDriver = neo4j.driver(
      config.database.neo4j.uri,
      neo4j.auth.basic(config.database.neo4j.user, config.database.neo4j.password)
    );

    // Test Neo4j connection
    const session = neo4jDriver.session();
    await session.run('RETURN 1');
    await session.close();
    logger.info('Neo4j connected successfully');

    // Redis connection
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port
      },
      password: config.redis.password,
      database: config.redis.db
    });

    await redisClient.connect();
    logger.info('Redis connected successfully');

    // Initialize services
    graphAnalyticsService = new GraphAnalyticsService(neo4jDriver, pgPool, redisClient);
    networkVisualizationService = new NetworkVisualizationService(neo4jDriver);

    logger.info('Graph analytics services initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Authentication middleware
app.use('/api', authenticate);

// Network Structure Analysis
app.post('/api/analysis/network-structure', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { filters } = req.body;
    
    const analysis = await graphAnalyticsService.analyzeNetworkStructure(filters);
    
    res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing network structure:', error);
    res.status(500).json({ error: 'Failed to analyze network structure' });
  }
});

// Path Analysis
app.post('/api/analysis/paths', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { sourceId, targetId, options } = req.body;
    
    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'Source and target IDs are required' });
    }
    
    const pathAnalysis = await graphAnalyticsService.findShortestPaths(sourceId, targetId, options);
    
    res.json(pathAnalysis);
  } catch (error) {
    logger.error('Error analyzing paths:', error);
    res.status(500).json({ error: 'Failed to analyze paths' });
  }
});

// Influence Analysis
app.post('/api/analysis/influence', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { nodeId, depth, relationshipTypes } = req.body;
    
    if (!nodeId) {
      return res.status(400).json({ error: 'Node ID is required' });
    }
    
    const influenceAnalysis = await graphAnalyticsService.analyzeInfluence(
      nodeId,
      depth || 3,
      relationshipTypes
    );
    
    res.json(influenceAnalysis);
  } catch (error) {
    logger.error('Error analyzing influence:', error);
    res.status(500).json({ error: 'Failed to analyze influence' });
  }
});

// Anomaly Detection
app.post('/api/analysis/anomalies', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { options } = req.body;
    
    const anomalies = await graphAnalyticsService.detectAnomalies(options);
    
    res.json({ anomalies });
  } catch (error) {
    logger.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

// Pattern Discovery
app.post('/api/analysis/patterns', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { patternTemplates } = req.body;
    
    if (!Array.isArray(patternTemplates) || patternTemplates.length === 0) {
      return res.status(400).json({ error: 'Pattern templates are required' });
    }
    
    const patterns = await graphAnalyticsService.findPatterns(patternTemplates);
    
    res.json({ patterns });
  } catch (error) {
    logger.error('Error finding patterns:', error);
    res.status(500).json({ error: 'Failed to find patterns' });
  }
});

// Built-in pattern templates
app.get('/api/analysis/pattern-templates', authorize(['user', 'admin']), (req, res) => {
  const builtInPatterns = [
    {
      name: 'Star Pattern',
      description: 'Central node with multiple direct connections',
      cypherPattern: 'MATCH path = (center)-[r]-(connected) WHERE size((center)--()) > 5 RETURN path'
    },
    {
      name: 'Chain Pattern',
      description: 'Linear sequence of connected nodes',
      cypherPattern: 'MATCH path = (a)-[r1]-(b)-[r2]-(c)-[r3]-(d) WHERE NOT (a)--(c) AND NOT (b)--(d) RETURN path'
    },
    {
      name: 'Triangle Pattern',
      description: 'Three nodes forming a complete triangle',
      cypherPattern: 'MATCH path = (a)-[r1]-(b)-[r2]-(c)-[r3]-(a) RETURN path'
    },
    {
      name: 'Bridge Pattern',
      description: 'Node connecting two otherwise disconnected components',
      cypherPattern: 'MATCH (bridge)-[r1]-(group1), (bridge)-[r2]-(group2) WHERE NOT (group1)-->(group2) RETURN bridge, group1, group2'
    },
    {
      name: 'Clique Pattern',
      description: 'Fully connected subgraph of 4+ nodes',
      cypherPattern: 'MATCH (a)--(b), (b)--(c), (c)--(d), (d)--(a), (a)--(c), (b)--(d) RETURN a, b, c, d'
    }
  ];
  
  res.json({ patterns: builtInPatterns });
});

// Temporal Analysis
app.post('/api/analysis/temporal', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { timeframe, intervals } = req.body;
    
    if (!timeframe || !timeframe.start || !timeframe.end) {
      return res.status(400).json({ error: 'Timeframe with start and end dates is required' });
    }
    
    const temporalAnalysis = await graphAnalyticsService.analyzeTemporalEvolution(
      {
        start: new Date(timeframe.start),
        end: new Date(timeframe.end)
      },
      intervals || 10
    );
    
    res.json(temporalAnalysis);
  } catch (error) {
    logger.error('Error analyzing temporal evolution:', error);
    res.status(500).json({ error: 'Failed to analyze temporal evolution' });
  }
});

// Network Visualization Generation
app.post('/api/visualization/generate', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { query, parameters, config } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Cypher query is required' });
    }
    
    const visualization = await networkVisualizationService.generateVisualization(
      query,
      parameters || {},
      config || {}
    );
    
    res.json(visualization);
  } catch (error) {
    logger.error('Error generating visualization:', error);
    res.status(500).json({ error: 'Failed to generate visualization' });
  }
});

// Pre-built Visualization Types
app.post('/api/visualization/subnet', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { centerNodeId, depth, config } = req.body;
    
    if (!centerNodeId) {
      return res.status(400).json({ error: 'Center node ID is required' });
    }
    
    const visualization = await networkVisualizationService.generateSubnetVisualization(
      centerNodeId,
      depth || 2,
      config || {}
    );
    
    res.json(visualization);
  } catch (error) {
    logger.error('Error generating subnet visualization:', error);
    res.status(500).json({ error: 'Failed to generate subnet visualization' });
  }
});

app.post('/api/visualization/community', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { communityIds, config } = req.body;
    
    if (!Array.isArray(communityIds) || communityIds.length === 0) {
      return res.status(400).json({ error: 'Community IDs are required' });
    }
    
    const visualization = await networkVisualizationService.generateCommunityVisualization(
      communityIds,
      config || {}
    );
    
    res.json(visualization);
  } catch (error) {
    logger.error('Error generating community visualization:', error);
    res.status(500).json({ error: 'Failed to generate community visualization' });
  }
});

app.post('/api/visualization/path', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { sourceId, targetId, pathType, config } = req.body;
    
    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'Source and target IDs are required' });
    }
    
    const visualization = await networkVisualizationService.generatePathVisualization(
      sourceId,
      targetId,
      pathType || 'shortest',
      config || {}
    );
    
    res.json(visualization);
  } catch (error) {
    logger.error('Error generating path visualization:', error);
    res.status(500).json({ error: 'Failed to generate path visualization' });
  }
});

app.post('/api/visualization/timeline', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { timeRange, config } = req.body;
    
    if (!timeRange || !timeRange.start || !timeRange.end) {
      return res.status(400).json({ error: 'Time range with start and end is required' });
    }
    
    const visualization = await networkVisualizationService.generateTimelineVisualization(
      {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end)
      },
      config || {}
    );
    
    res.json(visualization);
  } catch (error) {
    logger.error('Error generating timeline visualization:', error);
    res.status(500).json({ error: 'Failed to generate timeline visualization' });
  }
});

// Visualization Export
app.post('/api/visualization/export', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { visualization, format } = req.body;
    
    if (!visualization || !format) {
      return res.status(400).json({ error: 'Visualization data and format are required' });
    }
    
    const exportData = await networkVisualizationService.exportVisualization(
      visualization,
      format
    );
    
    const contentTypes = {
      cytoscape: 'application/json',
      gephi: 'application/xml',
      graphml: 'application/xml',
      json: 'application/json'
    };
    
    const extensions = {
      cytoscape: 'json',
      gephi: 'gexf',
      graphml: 'graphml',
      json: 'json'
    };
    
    res.setHeader('Content-Type', contentTypes[format] || 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="network.${extensions[format]}"`);
    res.send(exportData);
    
  } catch (error) {
    logger.error('Error exporting visualization:', error);
    res.status(500).json({ error: 'Failed to export visualization' });
  }
});

// Advanced Analytics Endpoints
app.post('/api/analysis/centrality', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { algorithm, filters } = req.body;
    
    // This would implement specific centrality algorithms
    res.status(501).json({ error: 'Centrality analysis not implemented yet' });
  } catch (error) {
    logger.error('Error calculating centrality:', error);
    res.status(500).json({ error: 'Failed to calculate centrality' });
  }
});

app.post('/api/analysis/community-detection', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { algorithm, parameters } = req.body;
    
    // This would implement community detection algorithms
    res.status(501).json({ error: 'Community detection not implemented yet' });
  } catch (error) {
    logger.error('Error detecting communities:', error);
    res.status(500).json({ error: 'Failed to detect communities' });
  }
});

app.post('/api/analysis/motifs', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { motifSize, filters } = req.body;
    
    // This would implement network motif detection
    res.status(501).json({ error: 'Motif detection not implemented yet' });
  } catch (error) {
    logger.error('Error detecting motifs:', error);
    res.status(500).json({ error: 'Failed to detect motifs' });
  }
});

// Real-time Graph Updates
app.get('/api/updates/stream', authorize(['user', 'admin']), (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connection
  res.write('data: {"type": "connected", "timestamp": "' + new Date().toISOString() + '"}\n\n');

  // Set up interval for periodic updates
  const interval = setInterval(() => {
    res.write('data: {"type": "heartbeat", "timestamp": "' + new Date().toISOString() + '"}\n\n');
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Graph Metrics Summary
app.get('/api/metrics/summary', authorize(['user', 'admin']), async (req, res) => {
  try {
    const session = neo4jDriver.session();
    
    try {
      const metricsQuery = `
        MATCH (n)
        OPTIONAL MATCH (n)-[r]-(m)
        RETURN 
          count(distinct n) as nodeCount,
          count(distinct r) as relationshipCount,
          count(distinct labels(n)) as labelCount,
          count(distinct type(r)) as relationshipTypeCount
      `;
      
      const result = await session.run(metricsQuery);
      const record = result.records[0];
      
      const summary = {
        nodes: record.get('nodeCount').toNumber(),
        relationships: record.get('relationshipCount').toNumber(),
        labels: record.get('labelCount').toNumber(),
        relationshipTypes: record.get('relationshipTypeCount').toNumber(),
        density: 0, // Would calculate based on actual network
        avgDegree: 0, // Would calculate
        components: 1, // Would calculate
        generatedAt: new Date().toISOString()
      };
      
      res.json(summary);
    } finally {
      await session.close();
    }
  } catch (error) {
    logger.error('Error getting graph metrics summary:', error);
    res.status(500).json({ error: 'Failed to get graph metrics summary' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    const server = app.listen(PORT, () => {
      logger.info(`Graph Analytics Engine server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await pgPool.end();
        await neo4jDriver.close();
        await redisClient.quit();
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await pgPool.end();
        await neo4jDriver.close();
        await redisClient.quit();
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app };