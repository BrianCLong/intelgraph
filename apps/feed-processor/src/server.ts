import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import { createClient } from 'redis';
import { FeedProcessorService } from './services/FeedProcessorService';
import { EnrichmentService } from './services/EnrichmentService';
import { logger } from './utils/logger';
import { config } from './config';
import { authenticate, authorize } from './middleware/auth';

const app = express();
const PORT = config.server.port || 4007;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.server.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
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
    service: 'feed-processor',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Database connections
let pgPool: Pool;
let neo4jDriver: neo4j.Driver;
let redisClient: any;
let feedProcessorService: FeedProcessorService;
let enrichmentService: EnrichmentService;

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
    feedProcessorService = new FeedProcessorService(pgPool, neo4jDriver, redisClient);
    enrichmentService = new EnrichmentService(pgPool, redisClient);

    // Set up event listeners
    feedProcessorService.on('feed.poll.completed', (data) => {
      logger.info(`Feed poll completed: ${data.sourceId}, ${data.itemCount} items`);
    });

    feedProcessorService.on('feed.poll.error', (data) => {
      logger.error(`Feed poll error: ${data.sourceId}, ${data.error}`);
    });

    feedProcessorService.on('item.processed', (data) => {
      logger.debug(`Item processed: ${data.itemId} in ${data.processingTime}ms`);
    });

    logger.info('Feed processor services initialized successfully');

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Authentication middleware
app.use('/api', authenticate);

// Feed Sources Management
app.post('/api/feed-sources', authorize(['user', 'admin']), async (req, res) => {
  try {
    const feedSource = await feedProcessorService.createFeedSource(req.body, req.user.id);
    res.status(201).json(feedSource);
  } catch (error) {
    logger.error('Error creating feed source:', error);
    res.status(500).json({ error: 'Failed to create feed source' });
  }
});

app.get('/api/feed-sources', authorize(['user', 'admin']), async (req, res) => {
  try {
    const query = `
      SELECT 
        fs.*,
        COUNT(fi.id) as total_items,
        COUNT(CASE WHEN fi.processing_status = 'stored' THEN 1 END) as processed_items,
        MAX(fi.processed_at) as last_item_processed
      FROM feed_sources fs
      LEFT JOIN feed_items fi ON fs.id = fi.source_id
      GROUP BY fs.id
      ORDER BY fs.updated_at DESC
    `;
    
    const result = await pgPool.query(query);
    
    const sources = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      status: row.status,
      lastPoll: row.last_poll,
      lastSuccess: row.last_success,
      errorCount: row.error_count,
      totalProcessed: row.total_processed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stats: {
        totalItems: parseInt(row.total_items),
        processedItems: parseInt(row.processed_items),
        lastItemProcessed: row.last_item_processed
      }
    }));
    
    res.json({ sources });
  } catch (error) {
    logger.error('Error listing feed sources:', error);
    res.status(500).json({ error: 'Failed to list feed sources' });
  }
});

app.get('/api/feed-sources/:id', authorize(['user', 'admin']), async (req, res) => {
  try {
    const source = await feedProcessorService.getFeedSource(req.params.id);
    
    if (!source) {
      return res.status(404).json({ error: 'Feed source not found' });
    }
    
    res.json(source);
  } catch (error) {
    logger.error('Error getting feed source:', error);
    res.status(500).json({ error: 'Failed to get feed source' });
  }
});

app.put('/api/feed-sources/:id', authorize(['user', 'admin']), async (req, res) => {
  try {
    // Update feed source implementation would go here
    res.status(501).json({ error: 'Update feed source not implemented yet' });
  } catch (error) {
    logger.error('Error updating feed source:', error);
    res.status(500).json({ error: 'Failed to update feed source' });
  }
});

app.delete('/api/feed-sources/:id', authorize(['admin']), async (req, res) => {
  try {
    await feedProcessorService.deleteSource(req.params.id);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting feed source:', error);
    res.status(500).json({ error: 'Failed to delete feed source' });
  }
});

// Feed Source Control
app.post('/api/feed-sources/:id/start', authorize(['user', 'admin']), async (req, res) => {
  try {
    const source = await feedProcessorService.getFeedSource(req.params.id);
    
    if (!source) {
      return res.status(404).json({ error: 'Feed source not found' });
    }
    
    await feedProcessorService.startPolling(source);
    res.json({ message: 'Feed source started successfully' });
  } catch (error) {
    logger.error('Error starting feed source:', error);
    res.status(500).json({ error: 'Failed to start feed source' });
  }
});

app.post('/api/feed-sources/:id/stop', authorize(['user', 'admin']), async (req, res) => {
  try {
    await feedProcessorService.stopPolling(req.params.id);
    res.json({ message: 'Feed source stopped successfully' });
  } catch (error) {
    logger.error('Error stopping feed source:', error);
    res.status(500).json({ error: 'Failed to stop feed source' });
  }
});

app.post('/api/feed-sources/:id/pause', authorize(['user', 'admin']), async (req, res) => {
  try {
    await feedProcessorService.pauseSource(req.params.id);
    res.json({ message: 'Feed source paused successfully' });
  } catch (error) {
    logger.error('Error pausing feed source:', error);
    res.status(500).json({ error: 'Failed to pause feed source' });
  }
});

app.post('/api/feed-sources/:id/resume', authorize(['user', 'admin']), async (req, res) => {
  try {
    await feedProcessorService.resumeSource(req.params.id);
    res.json({ message: 'Feed source resumed successfully' });
  } catch (error) {
    logger.error('Error resuming feed source:', error);
    res.status(500).json({ error: 'Failed to resume feed source' });
  }
});

// Feed Items
app.get('/api/feed-items', authorize(['user', 'admin']), async (req, res) => {
  try {
    const {
      page = '1',
      limit = '50',
      sourceId,
      status,
      search,
      startDate,
      endDate
    } = req.query;

    let whereConditions = ['1=1'];
    let params = [];
    let paramIndex = 1;

    if (sourceId) {
      whereConditions.push(`source_id = $${paramIndex}`);
      params.push(sourceId);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`processing_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`published_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`published_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitInt = parseInt(limit as string);

    const query = `
      SELECT 
        fi.*,
        fs.name as source_name
      FROM feed_items fi
      JOIN feed_sources fs ON fi.source_id = fs.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY fi.published_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limitInt, offset);

    const result = await pgPool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM feed_items fi
      WHERE ${whereConditions.slice(0, -2).join(' AND ')}
    `;

    const countResult = await pgPool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    const items = result.rows.map(row => ({
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name,
      originalId: row.original_id,
      title: row.title,
      description: row.description,
      content: row.content,
      publishedAt: row.published_at,
      url: row.url,
      author: row.author,
      category: row.category,
      tags: row.tags || [],
      processedData: row.processed_data || {},
      processingStatus: row.processing_status,
      processedAt: row.processed_at
    }));

    res.json({
      items,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: limitInt,
        pages: Math.ceil(total / limitInt)
      }
    });

  } catch (error) {
    logger.error('Error listing feed items:', error);
    res.status(500).json({ error: 'Failed to list feed items' });
  }
});

app.get('/api/feed-items/:id', authorize(['user', 'admin']), async (req, res) => {
  try {
    const query = `
      SELECT 
        fi.*,
        fs.name as source_name,
        fs.type as source_type
      FROM feed_items fi
      JOIN feed_sources fs ON fi.source_id = fs.id
      WHERE fi.id = $1
    `;

    const result = await pgPool.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feed item not found' });
    }

    const row = result.rows[0];
    const item = {
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name,
      sourceType: row.source_type,
      originalId: row.original_id,
      title: row.title,
      description: row.description,
      content: row.content,
      publishedAt: row.published_at,
      url: row.url,
      author: row.author,
      category: row.category,
      tags: row.tags || [],
      rawData: row.raw_data || {},
      processedData: row.processed_data || {},
      processingStatus: row.processing_status,
      processedAt: row.processed_at
    };

    res.json(item);

  } catch (error) {
    logger.error('Error getting feed item:', error);
    res.status(500).json({ error: 'Failed to get feed item' });
  }
});

// Manual enrichment
app.post('/api/feed-items/:id/enrich', authorize(['user', 'admin']), async (req, res) => {
  try {
    const itemQuery = `
      SELECT * FROM feed_items WHERE id = $1
    `;

    const result = await pgPool.query(itemQuery, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feed item not found' });
    }

    const row = result.rows[0];
    const item = {
      id: row.id,
      sourceId: row.source_id,
      originalId: row.original_id,
      title: row.title,
      description: row.description,
      content: row.content,
      publishedAt: row.published_at,
      url: row.url,
      author: row.author,
      category: row.category,
      tags: row.tags || [],
      rawData: row.raw_data || {},
      processedData: row.processed_data || {},
      processingStatus: row.processing_status,
      processedAt: row.processed_at
    };

    const enrichedItem = await enrichmentService.enrichItem(item);

    // Update the item with enriched data
    const updateQuery = `
      UPDATE feed_items 
      SET 
        processed_data = $1,
        processing_status = 'enriched',
        processed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await pgPool.query(updateQuery, [
      JSON.stringify(enrichedItem.processedData),
      req.params.id
    ]);

    res.json(enrichedItem);

  } catch (error) {
    logger.error('Error enriching feed item:', error);
    res.status(500).json({ error: 'Failed to enrich feed item' });
  }
});

// Feed Statistics
app.get('/api/feed-stats', authorize(['user', 'admin']), async (req, res) => {
  try {
    const { sourceId, days = '7' } = req.query;
    
    const stats = await feedProcessorService.getFeedStats(sourceId as string);
    
    // Additional aggregated stats
    const aggregateQuery = `
      SELECT 
        COUNT(DISTINCT fs.id) as total_sources,
        COUNT(DISTINCT CASE WHEN fs.status = 'active' THEN fs.id END) as active_sources,
        COUNT(fi.id) as total_items,
        COUNT(CASE WHEN fi.processing_status = 'stored' THEN 1 END) as processed_items,
        COUNT(CASE WHEN fi.processing_status = 'error' THEN 1 END) as error_items,
        COUNT(CASE WHEN fi.published_at >= NOW() - INTERVAL '${parseInt(days as string)} days' THEN 1 END) as recent_items
      FROM feed_sources fs
      LEFT JOIN feed_items fi ON fs.id = fi.source_id
    `;
    
    const aggregateResult = await pgPool.query(aggregateQuery);
    const aggregate = aggregateResult.rows[0];
    
    res.json({
      sources: stats,
      aggregate: {
        totalSources: parseInt(aggregate.total_sources),
        activeSources: parseInt(aggregate.active_sources),
        totalItems: parseInt(aggregate.total_items),
        processedItems: parseInt(aggregate.processed_items),
        errorItems: parseInt(aggregate.error_items),
        recentItems: parseInt(aggregate.recent_items),
        processingRate: aggregate.total_items > 0 
          ? (parseInt(aggregate.processed_items) / parseInt(aggregate.total_items) * 100).toFixed(2)
          : '0'
      }
    });
    
  } catch (error) {
    logger.error('Error getting feed stats:', error);
    res.status(500).json({ error: 'Failed to get feed stats' });
  }
});

// Enrichment provider stats
app.get('/api/enrichment/stats', authorize(['user', 'admin']), async (req, res) => {
  try {
    const stats = await enrichmentService.getProviderStats();
    res.json({ providers: stats });
  } catch (error) {
    logger.error('Error getting enrichment stats:', error);
    res.status(500).json({ error: 'Failed to get enrichment stats' });
  }
});

// Feed Source Templates
app.get('/api/feed-templates', authorize(['user', 'admin']), (req, res) => {
  const templates = [
    {
      id: 'rss-security-news',
      name: 'Security News RSS Feed',
      type: 'rss',
      description: 'RSS feed for security news and threat intelligence',
      configuration: {
        pollInterval: 300000, // 5 minutes
        format: {
          mapping: {
            title: 'title',
            description: 'description',
            content: 'content:encoded',
            publishedAt: 'pubDate',
            url: 'link',
            author: 'author',
            category: 'category'
          }
        },
        enrichment: {
          entityExtraction: true,
          threatIntelligence: true,
          sentiment: true,
          geoLocation: false
        }
      }
    },
    {
      id: 'json-api-feed',
      name: 'JSON API Feed',
      type: 'json',
      description: 'JSON-based API feed for structured data',
      configuration: {
        pollInterval: 600000, // 10 minutes
        authentication: {
          type: 'api_key',
          credentials: {
            header: 'X-API-Key',
            key: 'your-api-key'
          }
        },
        format: {
          mapping: {
            id: 'id',
            title: 'title',
            description: 'summary',
            content: 'content',
            publishedAt: 'created_at',
            url: 'url',
            author: 'author.name'
          }
        },
        enrichment: {
          entityExtraction: true,
          threatIntelligence: true,
          sentiment: true,
          geoLocation: true
        }
      }
    },
    {
      id: 'stix-threat-feed',
      name: 'STIX Threat Intelligence Feed',
      type: 'stix',
      description: 'STIX 2.1 structured threat intelligence feed',
      configuration: {
        pollInterval: 900000, // 15 minutes
        format: {
          mapping: {
            id: 'id',
            title: 'name',
            description: 'description',
            content: 'pattern',
            publishedAt: 'created',
            category: 'type'
          }
        },
        enrichment: {
          entityExtraction: true,
          threatIntelligence: true,
          sentiment: false,
          geoLocation: true
        }
      }
    }
  ];
  
  res.json({ templates });
});

// Real-time feed updates
app.get('/api/feed-updates/stream', authorize(['user', 'admin']), (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connection
  res.write('data: {"type": "connected", "timestamp": "' + new Date().toISOString() + '"}\n\n');

  // Set up event listeners
  const onItemProcessed = (data: any) => {
    res.write('data: ' + JSON.stringify({
      type: 'item.processed',
      data,
      timestamp: new Date().toISOString()
    }) + '\n\n');
  };

  const onPollCompleted = (data: any) => {
    res.write('data: ' + JSON.stringify({
      type: 'poll.completed',
      data,
      timestamp: new Date().toISOString()
    }) + '\n\n');
  };

  feedProcessorService.on('item.processed', onItemProcessed);
  feedProcessorService.on('feed.poll.completed', onPollCompleted);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write('data: {"type": "heartbeat", "timestamp": "' + new Date().toISOString() + '"}\n\n');
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    feedProcessorService.removeListener('item.processed', onItemProcessed);
    feedProcessorService.removeListener('feed.poll.completed', onPollCompleted);
  });
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
      logger.info(`Feed Processor server running on port ${PORT}`);
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