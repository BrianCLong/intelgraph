import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { EntityResolutionService } from './services/EntityResolutionService';
import { logger } from './utils/logger';
import { config } from './config';

const app = express();
const PORT = config.server.port || 4003;

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
    service: 'ml-engine',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Initialize ML service
let entityResolutionService: EntityResolutionService;

async function initializeServices() {
  try {
    entityResolutionService = new EntityResolutionService();
    await entityResolutionService.initialize();
    logger.info('ML services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize ML services:', error);
    process.exit(1);
  }
}

// Entity Resolution API Routes
app.post('/api/entity-resolution/find-duplicates', async (req, res) => {
  try {
    const { entityId, limit = 10, threshold = 0.8 } = req.body;
    
    if (!entityId) {
      return res.status(400).json({ error: 'entityId is required' });
    }

    const matches = await entityResolutionService.findDuplicates(entityId, limit, threshold);
    
    res.json({
      entityId,
      matches,
      total: matches.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error finding duplicates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/entity-resolution/bulk-resolve', async (req, res) => {
  try {
    const { entityIds, threshold = 0.8, maxClusters = 100 } = req.body;
    
    if (!Array.isArray(entityIds) || entityIds.length === 0) {
      return res.status(400).json({ error: 'entityIds array is required' });
    }

    const clusters = await entityResolutionService.bulkResolution(entityIds, threshold, maxClusters);
    
    res.json({
      clusters,
      totalEntities: entityIds.length,
      totalClusters: clusters.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in bulk resolution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/entity-resolution/train', async (req, res) => {
  try {
    const { positiveExamples, negativeExamples } = req.body;
    
    if (!Array.isArray(positiveExamples) || !Array.isArray(negativeExamples)) {
      return res.status(400).json({ 
        error: 'positiveExamples and negativeExamples arrays are required' 
      });
    }

    const result = await entityResolutionService.trainFromFeedback(
      positiveExamples,
      negativeExamples
    );
    
    res.json({
      success: true,
      trainingResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error training model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/entity-resolution/similarity', async (req, res) => {
  try {
    const { entity1Id, entity2Id } = req.body;
    
    if (!entity1Id || !entity2Id) {
      return res.status(400).json({ 
        error: 'entity1Id and entity2Id are required' 
      });
    }

    const similarity = await entityResolutionService.calculateSimilarity(entity1Id, entity2Id);
    
    res.json({
      entity1Id,
      entity2Id,
      similarity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error calculating similarity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/entity-resolution/metrics', async (req, res) => {
  try {
    const metrics = await entityResolutionService.getPerformanceMetrics();
    
    res.json({
      metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/entity-resolution/feedback', async (req, res) => {
  try {
    const { entity1Id, entity2Id, isMatch, confidence, userId } = req.body;
    
    if (!entity1Id || !entity2Id || typeof isMatch !== 'boolean') {
      return res.status(400).json({ 
        error: 'entity1Id, entity2Id, and isMatch are required' 
      });
    }

    await entityResolutionService.recordFeedback({
      entity1Id,
      entity2Id,
      isMatch,
      confidence: confidence || 1.0,
      userId,
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sentence encoding endpoints
app.post('/api/embeddings/encode', async (req, res) => {
  try {
    const { texts, modelName = 'all-MiniLM-L6-v2' } = req.body;
    
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'texts array is required' });
    }

    // Call Python service for embedding
    const embeddings = await entityResolutionService.getSemanticEmbeddings(texts, modelName);
    
    res.json({
      embeddings,
      count: texts.length,
      modelName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error encoding texts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/embeddings/similarity', async (req, res) => {
  try {
    const { text1, text2, modelName = 'all-MiniLM-L6-v2' } = req.body;
    
    if (!text1 || !text2) {
      return res.status(400).json({ error: 'text1 and text2 are required' });
    }

    const similarity = await entityResolutionService.calculateSemanticSimilarity(
      text1, 
      text2, 
      modelName
    );
    
    res.json({
      text1,
      text2,
      similarity,
      modelName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error calculating text similarity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch processing endpoints
app.post('/api/batch/entity-resolution', async (req, res) => {
  try {
    const { batchId, entities, config: batchConfig } = req.body;
    
    if (!batchId || !Array.isArray(entities)) {
      return res.status(400).json({ 
        error: 'batchId and entities array are required' 
      });
    }

    // Start batch processing (async)
    entityResolutionService.processBatch(batchId, entities, batchConfig)
      .catch(error => logger.error(`Batch ${batchId} failed:`, error));
    
    res.json({
      batchId,
      status: 'started',
      entityCount: entities.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error starting batch processing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/batch/:batchId/status', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const status = await entityResolutionService.getBatchStatus(batchId);
    
    res.json({
      batchId,
      ...status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting batch status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Model management endpoints
app.get('/api/models', async (req, res) => {
  try {
    const models = await entityResolutionService.getAvailableModels();
    
    res.json({
      models,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting available models:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/models/:modelName/load', async (req, res) => {
  try {
    const { modelName } = req.params;
    
    await entityResolutionService.loadModel(modelName);
    
    res.json({
      success: true,
      modelName,
      message: 'Model loaded successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error loading model:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      logger.info(`ML Engine API server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
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