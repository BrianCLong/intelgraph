"use strict";
/**
 * Generic REST Connector API Routes
 * RESTful endpoints for managing external API connections
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const RestConnectorService = require('../services/RestConnectorService');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiting');
const { validateRequest } = require('../middleware/validation');
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = express.Router();
// Apply authentication and rate limiting
router.use(ensureAuthenticated);
router.use(rateLimiter({ windowMs: 60000, max: 100 })); // 100 requests per minute
// Validation schemas
const requestSchema = {
    url: { type: 'string', required: true, format: 'uri' },
    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    headers: { type: 'object' },
    body: { type: 'object' },
    auth: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['bearer', 'basic', 'apikey', 'oauth2'] },
            token: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
            key: { type: 'string' },
            header: { type: 'string' },
            accessToken: { type: 'string' }
        }
    },
    timeout: { type: 'number', min: 1000, max: 60000 },
    retries: { type: 'number', min: 0, max: 5 }
};
const paginatedRequestSchema = {
    baseUrl: { type: 'string', required: true, format: 'uri' },
    paginationType: { type: 'string', enum: ['offset', 'cursor', 'page'] },
    pageSize: { type: 'number', min: 1, max: 500 },
    maxPages: { type: 'number', min: 1, max: 100 },
    auth: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['bearer', 'basic', 'apikey', 'oauth2'] },
            token: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
            key: { type: 'string' },
            header: { type: 'string' },
            accessToken: { type: 'string' }
        }
    },
    headers: { type: 'object' },
    queryParams: { type: 'object' }
};
const webhookSchema = {
    webhookUrl: { type: 'string', required: true, format: 'uri' },
    targetUrl: { type: 'string', required: true, format: 'uri' },
    events: { type: 'array', items: { type: 'string' } },
    secret: { type: 'string' },
    auth: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['bearer', 'basic', 'apikey', 'oauth2'] },
            token: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
            key: { type: 'string' },
            header: { type: 'string' },
            accessToken: { type: 'string' }
        }
    }
};
/**
 * @swagger
 * /api/connector/request:
 *   post:
 *     summary: Make a generic HTTP request to external API
 *     tags: [Connector]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Target URL
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *                 default: GET
 *               headers:
 *                 type: object
 *                 description: Custom headers
 *               body:
 *                 type: object
 *                 description: Request body for POST/PUT/PATCH
 *               auth:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [bearer, basic, apikey, oauth2]
 *                   token:
 *                     type: string
 *                   username:
 *                     type: string
 *                   password:
 *                     type: string
 *                   key:
 *                     type: string
 *                   header:
 *                     type: string
 *               timeout:
 *                 type: number
 *                 minimum: 1000
 *                 maximum: 60000
 *               retries:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Request successful
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/request', validateRequest(requestSchema), async (req, res) => {
    try {
        const connector = new RestConnectorService();
        const result = await connector.request(req.body);
        logger_js_1.default.info('REST connector request', {
            userId: req.user?.id,
            url: req.body.url,
            method: req.body.method || 'GET',
            success: result.success
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('REST connector request failed', {
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
 * /api/connector/paginated:
 *   post:
 *     summary: Fetch paginated data from external API
 *     tags: [Connector]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - baseUrl
 *             properties:
 *               baseUrl:
 *                 type: string
 *                 format: uri
 *               paginationType:
 *                 type: string
 *                 enum: [offset, cursor, page]
 *                 default: offset
 *               pageSize:
 *                 type: number
 *                 default: 50
 *               maxPages:
 *                 type: number
 *                 default: 10
 *               auth:
 *                 type: object
 *               headers:
 *                 type: object
 *               queryParams:
 *                 type: object
 *     responses:
 *       200:
 *         description: Paginated data fetched successfully
 */
router.post('/paginated', validateRequest(paginatedRequestSchema), async (req, res) => {
    try {
        const connector = new RestConnectorService();
        const result = await connector.fetchPaginated(req.body);
        logger_js_1.default.info('Paginated data fetch', {
            userId: req.user?.id,
            baseUrl: req.body.baseUrl,
            totalItems: result.totalItems,
            pagesFetched: result.pagesFetched
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('Paginated fetch failed', {
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
 * /api/connector/webhook:
 *   post:
 *     summary: Setup webhook with external service
 *     tags: [Connector]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - webhookUrl
 *               - targetUrl
 *             properties:
 *               webhookUrl:
 *                 type: string
 *                 format: uri
 *                 description: External service webhook endpoint
 *               targetUrl:
 *                 type: string
 *                 format: uri
 *                 description: Our webhook handler URL
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Events to subscribe to
 *               secret:
 *                 type: string
 *                 description: Webhook secret for verification
 *               auth:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook setup successful
 */
router.post('/webhook', requirePermission('connector:manage'), validateRequest(webhookSchema), async (req, res) => {
    try {
        const connector = new RestConnectorService();
        const result = await connector.setupWebhook(req.body);
        logger_js_1.default.info('Webhook setup', {
            userId: req.user?.id,
            webhookUrl: req.body.webhookUrl,
            targetUrl: req.body.targetUrl,
            success: result.success
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('Webhook setup failed', {
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
 * /api/connector/batch:
 *   post:
 *     summary: Execute multiple requests in batch
 *     tags: [Connector]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requests
 *             properties:
 *               requests:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     method:
 *                       type: string
 *                     headers:
 *                       type: object
 *                     body:
 *                       type: object
 *               concurrency:
 *                 type: number
 *                 default: 5
 *               batchSize:
 *                 type: number
 *                 default: 10
 *               delayBetweenBatches:
 *                 type: number
 *                 default: 1000
 *     responses:
 *       200:
 *         description: Batch requests completed
 */
router.post('/batch', requirePermission('connector:manage'), async (req, res) => {
    try {
        const { requests, ...options } = req.body;
        if (!Array.isArray(requests) || requests.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'requests array is required'
            });
        }
        const connector = new RestConnectorService();
        const result = await connector.batchRequests(requests, options);
        logger_js_1.default.info('Batch requests executed', {
            userId: req.user?.id,
            totalRequests: result.totalRequests,
            successfulRequests: result.successfulRequests,
            failedRequests: result.failedRequests
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('Batch requests failed', {
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
 * /api/connector/health:
 *   get:
 *     summary: Get connector service health
 *     tags: [Connector]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Health status
 */
router.get('/health', async (req, res) => {
    try {
        const connector = new RestConnectorService();
        const health = connector.getHealth();
        res.json({
            status: 'healthy',
            service: 'rest-connector',
            ...health,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            service: 'rest-connector',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * Built-in connectors for common services
 */
/**
 * @swagger
 * /api/connector/github/{owner}/{repo}/issues:
 *   get:
 *     summary: Fetch GitHub repository issues
 *     tags: [Connector]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: owner
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: repo
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: token
 *         in: header
 *         schema:
 *           type: string
 *           description: GitHub access token
 *     responses:
 *       200:
 *         description: GitHub issues
 */
router.get('/github/:owner/:repo/issues', async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const token = req.headers['x-github-token'];
        const connector = new RestConnectorService();
        const result = await connector.fetchPaginated({
            baseUrl: `https://api.github.com/repos/${owner}/${repo}/issues`,
            paginationType: 'page',
            pageSize: 100,
            maxPages: 5,
            auth: token ? { type: 'bearer', token } : undefined,
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            },
            queryParams: {
                state: 'all',
                sort: 'updated',
                direction: 'desc'
            }
        });
        logger_js_1.default.info('GitHub issues fetched', {
            userId: req.user?.id,
            owner,
            repo,
            totalIssues: result.totalItems
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('GitHub issues fetch failed', {
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
 * /api/connector/slack/channels:
 *   get:
 *     summary: Fetch Slack channels
 *     tags: [Connector]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: token
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           description: Slack access token
 *     responses:
 *       200:
 *         description: Slack channels
 */
router.get('/slack/channels', async (req, res) => {
    try {
        const token = req.headers['x-slack-token'];
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Slack token required in X-Slack-Token header'
            });
        }
        const connector = new RestConnectorService();
        const result = await connector.fetchPaginated({
            baseUrl: 'https://slack.com/api/conversations.list',
            paginationType: 'cursor',
            pageSize: 200,
            maxPages: 10,
            auth: { type: 'bearer', token },
            queryParams: {
                types: 'public_channel,private_channel'
            }
        });
        logger_js_1.default.info('Slack channels fetched', {
            userId: req.user?.id,
            totalChannels: result.totalItems
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('Slack channels fetch failed', {
            userId: req.user?.id,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
module.exports = router;
//# sourceMappingURL=connectorRoutes.js.map