/**
 * Federation API Routes
 * P0 Critical - MVP1 federated search endpoints
 */
const express = require('express');
const FederationController = require('../controllers/FederationController');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiting');
const router = express.Router();
// Validation schemas
const registerInstanceSchema = {
    id: {
        type: 'string',
        required: true,
        pattern: '^[a-zA-Z0-9_-]+$',
        minLength: 3,
        maxLength: 50
    },
    name: {
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 100
    },
    endpoint: {
        type: 'string',
        required: true,
        format: 'uri'
    },
    apiKey: {
        type: 'string',
        required: true,
        minLength: 10
    },
    publicKey: {
        type: 'string'
    },
    capabilities: {
        type: 'array',
        items: {
            type: 'string',
            enum: [
                'geo_search',
                'temporal_analysis',
                'sentiment_analysis',
                'graph_analytics',
                'multimodal_search',
                'nlp_processing',
                'threat_intelligence',
                'social_analysis'
            ]
        }
    },
    accessLevel: {
        type: 'string',
        enum: ['public', 'restricted', 'private'],
        default: 'public'
    },
    maxConcurrentQueries: {
        type: 'number',
        minimum: 1,
        maximum: 20,
        default: 5
    },
    timeout: {
        type: 'number',
        minimum: 5000,
        maximum: 120000,
        default: 30000
    }
};
const updateInstanceSchema = {
    name: {
        type: 'string',
        minLength: 3,
        maxLength: 100
    },
    capabilities: {
        type: 'array',
        items: {
            type: 'string',
            enum: [
                'geo_search',
                'temporal_analysis',
                'sentiment_analysis',
                'graph_analytics',
                'multimodal_search',
                'nlp_processing',
                'threat_intelligence',
                'social_analysis'
            ]
        }
    },
    accessLevel: {
        type: 'string',
        enum: ['public', 'restricted', 'private']
    },
    maxConcurrentQueries: {
        type: 'number',
        minimum: 1,
        maximum: 20
    },
    timeout: {
        type: 'number',
        minimum: 5000,
        maximum: 120000
    }
};
const federatedSearchSchema = {
    query: {
        type: 'object',
        required: true,
        properties: {
            graphql: {
                type: 'string',
                required: true,
                minLength: 10
            },
            variables: {
                type: 'object'
            }
        }
    },
    instances: {
        type: 'array',
        items: {
            type: 'string'
        }
    },
    maxResults: {
        type: 'number',
        minimum: 1,
        maximum: 1000,
        default: 100
    },
    timeout: {
        type: 'number',
        minimum: 1000,
        maximum: 120000,
        default: 30000
    },
    aggregateResults: {
        type: 'boolean',
        default: true
    },
    respectACL: {
        type: 'boolean',
        default: true
    },
    cacheResults: {
        type: 'boolean',
        default: true
    }
};
// Initialize controller
let federationController;
const initializeRoutes = (authService) => {
    federationController = new FederationController(authService);
    return router;
};
// Apply authentication to all routes
router.use(ensureAuthenticated);
/**
 * @swagger
 * /api/federation/instances:
 *   post:
 *     summary: Register a new federated instance
 *     tags: [Federation]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - endpoint
 *               - apiKey
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique instance identifier
 *               name:
 *                 type: string
 *                 description: Human-readable instance name
 *               endpoint:
 *                 type: string
 *                 format: uri
 *                 description: Instance API endpoint
 *               apiKey:
 *                 type: string
 *                 description: API key for authentication
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Instance capabilities
 *               accessLevel:
 *                 type: string
 *                 enum: [public, restricted, private]
 *                 description: Access control level
 *     responses:
 *       201:
 *         description: Instance registered successfully
 *       400:
 *         description: Invalid request data
 *       403:
 *         description: Admin permissions required
 */
router.post('/instances', rateLimiter({ windowMs: 300000, max: 10 }), // 10 requests per 5 minutes
validateRequest(registerInstanceSchema), requirePermission('federation:manage'), async (req, res) => {
    await federationController.registerInstance(req, res);
});
/**
 * @swagger
 * /api/federation/instances:
 *   get:
 *     summary: List all federated instances
 *     tags: [Federation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of federated instances
 *       403:
 *         description: Insufficient permissions
 */
router.get('/instances', async (req, res) => {
    await federationController.listInstances(req, res);
});
/**
 * @swagger
 * /api/federation/instances/{id}:
 *   get:
 *     summary: Get specific instance details
 *     tags: [Federation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instance details
 *       404:
 *         description: Instance not found
 *       403:
 *         description: Access denied
 */
router.get('/instances/:id', async (req, res) => {
    await federationController.getInstance(req, res);
});
/**
 * @swagger
 * /api/federation/instances/{id}:
 *   patch:
 *     summary: Update instance configuration
 *     tags: [Federation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               accessLevel:
 *                 type: string
 *                 enum: [public, restricted, private]
 *     responses:
 *       200:
 *         description: Instance updated successfully
 *       404:
 *         description: Instance not found
 *       403:
 *         description: Admin permissions required
 */
router.patch('/instances/:id', validateRequest(updateInstanceSchema), requirePermission('federation:manage'), async (req, res) => {
    await federationController.updateInstance(req, res);
});
/**
 * @swagger
 * /api/federation/instances/{id}:
 *   delete:
 *     summary: Unregister instance from federation
 *     tags: [Federation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Instance unregistered successfully
 *       404:
 *         description: Instance not found
 *       403:
 *         description: Admin permissions required
 */
router.delete('/instances/:id', requirePermission('federation:manage'), async (req, res) => {
    await federationController.unregisterInstance(req, res);
});
/**
 * @swagger
 * /api/federation/search:
 *   post:
 *     summary: Execute federated search across instances
 *     tags: [Federation]
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
 *             properties:
 *               query:
 *                 type: object
 *                 required:
 *                   - graphql
 *                 properties:
 *                   graphql:
 *                     type: string
 *                     description: GraphQL query string
 *                   variables:
 *                     type: object
 *                     description: GraphQL variables
 *               instances:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific instances to query (empty = all)
 *               maxResults:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 100
 *               aggregateResults:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Federated search results
 *       400:
 *         description: Invalid query or parameters
 */
router.post('/search', rateLimiter({ windowMs: 60000, max: 30 }), // 30 searches per minute
validateRequest(federatedSearchSchema), async (req, res) => {
    await federationController.federatedSearch(req, res);
});
/**
 * @swagger
 * /api/federation/instances/{id}/test:
 *   post:
 *     summary: Test instance connectivity and capabilities
 *     tags: [Federation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection test results
 *       404:
 *         description: Instance not found
 *       403:
 *         description: Insufficient permissions
 */
router.post('/instances/:id/test', requirePermission('federation:manage'), async (req, res) => {
    await federationController.testInstance(req, res);
});
/**
 * @swagger
 * /api/federation/stats:
 *   get:
 *     summary: Get federation statistics (admin only)
 *     tags: [Federation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Federation statistics
 *       403:
 *         description: Admin permissions required
 */
router.get('/stats', requirePermission('federation:manage'), async (req, res) => {
    await federationController.getFederationStats(req, res);
});
/**
 * @swagger
 * /api/federation/capabilities:
 *   get:
 *     summary: Get available query capabilities across instances
 *     tags: [Federation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Available capabilities
 */
router.get('/capabilities', async (req, res) => {
    await federationController.getCapabilities(req, res);
});
/**
 * @swagger
 * /api/federation/cache/clear:
 *   post:
 *     summary: Clear federation query cache (admin only)
 *     tags: [Federation]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       403:
 *         description: Admin permissions required
 */
router.post('/cache/clear', requirePermission('federation:manage'), async (req, res) => {
    await federationController.clearCache(req, res);
});
// Health check for federation service
router.get('/health', (req, res) => {
    const controller = federationController;
    const stats = controller ? controller.federatedSearch.getFederationStats() : null;
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'federation-api',
        version: '1.0.0',
        connectedInstances: stats?.connectedInstances || 0,
        healthyInstances: stats?.healthyInstances || 0,
        cacheSize: stats?.cacheSize || 0
    });
});
module.exports = {
    router,
    initializeRoutes
};
//# sourceMappingURL=federationRoutes.js.map