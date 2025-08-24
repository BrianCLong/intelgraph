/**
 * GraphRAG REST API Routes
 * RESTful endpoints for GraphRAG operations
 */

const express = require('express');
const GraphRAGService = require('../services/GraphRAGService');
const EmbeddingService = require('../services/EmbeddingService');
const LLMService = require('../services/LLMService');
const { getNeo4jDriver, getRedisClient } = require('../config/database');
const { ensureAuthenticated } = require('../middleware/auth');
const { graphRagRateLimiter } = require('../middleware/rateLimit');
const { validateRequest } = require('../middleware/validation');
import logger from '../utils/logger.js';

const router = express.Router();

// Initialize services
let graphRAGService;
let embeddingService;
let llmService;

function initializeServices() {
  if (!graphRAGService) {
    const neo4jDriver = getNeo4jDriver();
    const redisClient = getRedisClient();
    
    embeddingService = new EmbeddingService();
    llmService = new LLMService();
    graphRAGService = new GraphRAGService(neo4jDriver, embeddingService, llmService, redisClient);
  }
}

// Apply authentication and rate limiting to all routes
router.use(ensureAuthenticated);
router.use(graphRagRateLimiter);

// Validation schemas
const querySchema = {
  query: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
  investigationId: { type: 'string', required: true },
  context: { type: 'object' },
  maxResults: { type: 'number', min: 1, max: 100 },
  depth: { type: 'number', min: 1, max: 5 },
  model: { type: 'string' },
  temperature: { type: 'number', min: 0, max: 2 }
};

const embeddingSchema = {
  investigationId: { type: 'string', required: true },
  batchSize: { type: 'number', min: 1, max: 100 },
  model: { type: 'string' }
};

/**
 * @swagger
 * /api/graphrag/query:
 *   post:
 *     summary: Query knowledge graph using GraphRAG
 *     tags: [GraphRAG]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - investigationId
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language query
 *                 example: "What entities are connected to suspicious transactions?"
 *               investigationId:
 *                 type: string
 *                 description: Investigation ID
 *               context:
 *                 type: object
 *                 description: Additional context
 *               maxResults:
 *                 type: integer
 *                 description: Maximum number of results
 *                 default: 20
 *               depth:
 *                 type: integer
 *                 description: Graph traversal depth
 *                 default: 2
 *               model:
 *                 type: string
 *                 description: LLM model to use
 *               temperature:
 *                 type: number
 *                 description: LLM temperature
 *                 default: 0.3
 *     responses:
 *       200:
 *         description: GraphRAG query response
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/query', validateRequest(querySchema), async (req, res) => {
  initializeServices();

  try {
    const result = await graphRAGService.query({
      query: req.body.query,
      investigationId: req.body.investigationId,
      context: req.body.context || {},
      options: {
        maxResults: req.body.maxResults,
        depth: req.body.depth,
        model: req.body.model,
        temperature: req.body.temperature,
        maxTokens: req.body.maxTokens
      }
    });

    logger.info('GraphRAG query via REST API', {
      userId: req.user?.id,
      investigationId: req.body.investigationId,
      success: result.success
    });

    res.json(result);
  } catch (error) {
    logger.error('GraphRAG REST query failed', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/graphrag/embeddings/generate:
 *   post:
 *     summary: Generate embeddings for entities
 *     tags: [GraphRAG]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - investigationId
 *             properties:
 *               investigationId:
 *                 type: string
 *                 description: Investigation ID
 *               batchSize:
 *                 type: integer
 *                 description: Batch size for processing
 *                 default: 50
 *               model:
 *                 type: string
 *                 description: Embedding model to use
 *     responses:
 *       200:
 *         description: Embedding generation response
 */
router.post('/embeddings/generate', validateRequest(embeddingSchema), async (req, res) => {
  initializeServices();

  try {
    const neo4jDriver = getNeo4jDriver();
    const session = neo4jDriver.session();

    try {
      // Get entities without embeddings
      const entitiesQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        WHERE e.embedding IS NULL
        RETURN e.id as id, e.label as label, e.description as description, e.properties as properties
        LIMIT $batchSize
      `;

      const entitiesResult = await session.run(entitiesQuery, {
        investigationId: req.body.investigationId,
        batchSize: req.body.batchSize || 50
      });

      if (entitiesResult.records.length === 0) {
        return res.json({
          success: true,
          message: 'No entities need embedding generation',
          processedCount: 0,
          totalEntities: 0
        });
      }

      const entities = entitiesResult.records.map(record => ({
        id: record.get('id'),
        text: `${record.get('label')} ${record.get('description')} ${JSON.stringify(record.get('properties'))}`
      }));

      // Generate embeddings
      const embeddings = await embeddingService.generateEmbeddings(
        entities.map(e => e.text),
        req.body.model
      );

      // Store embeddings in Neo4j
      for (let i = 0; i < entities.length; i++) {
        await session.run(
          'MATCH (e:Entity {id: $id}) SET e.embedding = $embedding, e.embeddingModel = $model, e.embeddingGeneratedAt = datetime()',
          {
            id: entities[i].id,
            embedding: embeddings[i],
            model: req.body.model || embeddingService.config.model
          }
        );
      }

      logger.info('Embeddings generated via REST API', {
        userId: req.user?.id,
        investigationId: req.body.investigationId,
        count: entities.length
      });

      res.json({
        success: true,
        message: `Generated embeddings for ${entities.length} entities`,
        processedCount: entities.length,
        totalEntities: entities.length
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    logger.error('Embedding generation via REST API failed', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/graphrag/popular:
 *   get:
 *     summary: List popular subgraph cache keys
 *     tags: [GraphRAG]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Popular subgraphs
 */
router.get('/popular', async (req, res) => {
  initializeServices();
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  try {
    const popular = await graphRAGService.getPopularSubgraphs(limit);
    res.json({ popular });
  } catch (error) {
    logger.error('Failed to get popular subgraphs', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/graphrag/health:
 *   get:
 *     summary: Get GraphRAG service health
 *     tags: [GraphRAG]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Health status
 */
router.get('/health', async (req, res) => {
  initializeServices();

  try {
    const health = graphRAGService.getHealth();
    const embeddingHealth = embeddingService.getHealth();
    const llmHealth = llmService.getHealth();

    res.json({
      status: 'healthy',
      services: {
        graphRAG: health,
        embedding: embeddingHealth,
        llm: llmHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/graphrag/test:
 *   post:
 *     summary: Test GraphRAG services
 *     tags: [GraphRAG]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Test results
 */
router.post('/test', async (req, res) => {
  initializeServices();

  try {
    const embeddingTest = await embeddingService.test();
    const llmTest = await llmService.test();

    res.json({
      success: embeddingTest.success && llmTest.success,
      embedding: embeddingTest,
      llm: llmTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;