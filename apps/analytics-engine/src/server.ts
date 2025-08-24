import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import { createClient } from 'redis';
import { DashboardService } from './services/DashboardService';
import { ChartService } from './services/ChartService';
import { logger } from './utils/logger';
import { config } from './config';
import { authenticate, authorize } from './middleware/auth';

const app = express();
const PORT = config.server.port || 4004;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.server.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
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
    service: 'analytics-engine',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Database connections
let pgPool: Pool;
let neo4jDriver: neo4j.Driver;
let redisClient: any;
let dashboardService: DashboardService;
let chartService: ChartService;

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
    dashboardService = new DashboardService(pgPool, neo4jDriver, redisClient);
    chartService = new ChartService(pgPool, neo4jDriver);

    logger.info('Analytics services initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Authentication middleware
app.use('/api', authenticate);

// Dashboard API Routes
app.post('/api/dashboards', authorize(['user', 'admin']), async (req, res) => {
  try {
    const dashboard = await dashboardService.createDashboard(req.body, req.user.id);
    res.status(201).json(dashboard);
  } catch (error) {
    logger.error('Error creating dashboard:', error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

app.get('/api/dashboards', authorize(['user', 'admin']), async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      tags,
      sortBy = 'updated_at',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string),
      search: search as string,
      tags: tags ? (tags as string).split(',') : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    const result = await dashboardService.listDashboards(req.user.id, options);
    
    res.json({
      dashboards: result.dashboards,
      pagination: {
        total: result.total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(result.total / parseInt(limit as string))
      }
    });
  } catch (error) {
    logger.error('Error listing dashboards:', error);
    res.status(500).json({ error: 'Failed to list dashboards' });
  }
});

app.get('/api/dashboards/:id', authorize(['user', 'admin']), async (req, res) => {
  try {
    const dashboard = await dashboardService.getDashboard(req.params.id, req.user.id);
    
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    res.json(dashboard);
  } catch (error) {
    logger.error('Error getting dashboard:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

app.put('/api/dashboards/:id', authorize(['user', 'admin']), async (req, res) => {
  try {
    const dashboard = await dashboardService.updateDashboard(
      req.params.id,
      req.body,
      req.user.id
    );
    
    res.json(dashboard);
  } catch (error) {
    logger.error('Error updating dashboard:', error);
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

app.delete('/api/dashboards/:id', authorize(['user', 'admin']), async (req, res) => {
  try {
    await dashboardService.deleteDashboard(req.params.id, req.user.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting dashboard:', error);
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

// Widget data endpoint
app.get('/api/widgets/:id/data', authorize(['user', 'admin']), async (req, res) => {
  try {
    const data = await dashboardService.getWidgetData(req.params.id, req.user.id);
    res.json({ data, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Error getting widget data:', error);
    res.status(500).json({ error: 'Failed to get widget data' });
  }
});

// Chart generation endpoints
app.post('/api/charts/generate', authorize(['user', 'admin']), async (req, res) => {
  try {
    const chartData = await chartService.generateChartData(req.body);
    res.json(chartData);
  } catch (error) {
    logger.error('Error generating chart:', error);
    res.status(500).json({ error: 'Failed to generate chart' });
  }
});

// Predefined chart endpoints
app.get('/api/charts/entity-growth', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { start, end } = req.query;
    
    const timeRange = {
      start: new Date(start as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      end: new Date(end as string || new Date())
    };
    
    const chartData = await chartService.getEntityGrowthChart(timeRange);
    res.json(chartData);
  } catch (error) {
    logger.error('Error getting entity growth chart:', error);
    res.status(500).json({ error: 'Failed to generate entity growth chart' });
  }
});

app.get('/api/charts/entity-types', authorize(['user', 'admin']), async (req, res) => {
  try {
    const chartData = await chartService.getEntityTypeDistribution();
    res.json(chartData);
  } catch (error) {
    logger.error('Error getting entity type distribution:', error);
    res.status(500).json({ error: 'Failed to generate entity type distribution' });
  }
});

app.get('/api/charts/case-status', authorize(['user', 'admin']), async (req, res) => {
  try {
    const chartData = await chartService.getCaseStatusComparison();
    res.json(chartData);
  } catch (error) {
    logger.error('Error getting case status comparison:', error);
    res.status(500).json({ error: 'Failed to generate case status comparison' });
  }
});

app.get('/api/charts/activity-heatmap', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { days = '30' } = req.query;
    const heatmapData = await chartService.getActivityHeatmapData(parseInt(days as string));
    res.json(heatmapData);
  } catch (error) {
    logger.error('Error getting activity heatmap:', error);
    res.status(500).json({ error: 'Failed to generate activity heatmap' });
  }
});

// Dashboard templates endpoints
app.get('/api/dashboard-templates', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await dashboardService.getDashboardTemplates(category as string);
    res.json(templates);
  } catch (error) {
    logger.error('Error getting dashboard templates:', error);
    res.status(500).json({ error: 'Failed to get dashboard templates' });
  }
});

app.post('/api/dashboard-templates/:id/create', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { name, customizations } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Dashboard name is required' });
    }
    
    const dashboard = await dashboardService.createDashboardFromTemplate(
      req.params.id,
      name,
      req.user.id,
      customizations
    );
    
    res.status(201).json(dashboard);
  } catch (error) {
    logger.error('Error creating dashboard from template:', error);
    res.status(500).json({ error: 'Failed to create dashboard from template' });
  }
});

// Analytics insights endpoints
app.get('/api/insights/overview', authorize(['user', 'admin']), async (req, res) => {
  try {
    const insights = await generateOverviewInsights(req.user.id);
    res.json(insights);
  } catch (error) {
    logger.error('Error generating overview insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

app.get('/api/insights/trends', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const trends = await generateTrendInsights(req.user.id, period as string);
    res.json(trends);
  } catch (error) {
    logger.error('Error generating trend insights:', error);
    res.status(500).json({ error: 'Failed to generate trend insights' });
  }
});

// Export endpoints
app.post('/api/dashboards/:id/export', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { format = 'json' } = req.body;
    
    const dashboard = await dashboardService.getDashboard(req.params.id, req.user.id);
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }
    
    if (format === 'json') {
      res.json(dashboard);
    } else if (format === 'pdf') {
      // TODO: Implement PDF export
      res.status(501).json({ error: 'PDF export not implemented yet' });
    } else {
      res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error) {
    logger.error('Error exporting dashboard:', error);
    res.status(500).json({ error: 'Failed to export dashboard' });
  }
});

// Helper functions for insights
async function generateOverviewInsights(userId: string): Promise<any> {
  const queries = [
    'SELECT COUNT(*) as total_entities FROM entities',
    'SELECT COUNT(*) as total_cases FROM cases',
    'SELECT COUNT(*) as total_relationships FROM relationships',
    'SELECT COUNT(*) as total_dashboards FROM dashboards WHERE created_by = $1'
  ];
  
  const results = await Promise.all([
    pgPool.query(queries[0]),
    pgPool.query(queries[1]),
    pgPool.query(queries[2]),
    pgPool.query(queries[3], [userId])
  ]);
  
  return {
    totalEntities: parseInt(results[0].rows[0].total_entities),
    totalCases: parseInt(results[1].rows[0].total_cases),
    totalRelationships: parseInt(results[2].rows[0].total_relationships),
    totalDashboards: parseInt(results[3].rows[0].total_dashboards),
    generatedAt: new Date()
  };
}

async function generateTrendInsights(userId: string, period: string): Promise<any> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  
  const query = `
    SELECT 
      DATE_TRUNC('day', created_at) as date,
      'entities' as type,
      COUNT(*) as count
    FROM entities 
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE_TRUNC('day', created_at)
    
    UNION ALL
    
    SELECT 
      DATE_TRUNC('day', created_at) as date,
      'cases' as type,
      COUNT(*) as count
    FROM cases 
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE_TRUNC('day', created_at)
    
    ORDER BY date DESC
  `;
  
  const result = await pgPool.query(query);
  
  return {
    trends: result.rows,
    period,
    generatedAt: new Date()
  };
}

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
      logger.info(`Analytics Engine server running on port ${PORT}`);
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