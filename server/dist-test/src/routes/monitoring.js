"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Monitoring and observability endpoints
 */
const express_1 = __importDefault(require("express"));
const metrics_js_1 = require("../monitoring/metrics.js");
const health_js_1 = require("../monitoring/health.js");
const router = express_1.default.Router();
router.use(express_1.default.json());
/**
 * Prometheus metrics endpoint
 * GET /metrics
 */
router.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', metrics_js_1.register.contentType);
        const metrics = await metrics_js_1.register.metrics();
        res.end(metrics);
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to collect metrics',
            details: error.message,
        });
    }
});
/**
 * Comprehensive health check endpoint
 * GET /health
 */
router.get('/health', async (req, res) => {
    try {
        const health = await (0, health_js_1.performHealthCheck)();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
/**
 * Quick health check (cached)
 * GET /health/quick
 */
router.get('/health/quick', (req, res) => {
    try {
        const health = (0, health_js_1.getCachedHealthStatus)();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
/**
 * Kubernetes liveness probe
 * GET /health/live
 */
router.get('/health/live', async (req, res) => {
    try {
        const liveness = await (0, health_js_1.livenessProbe)();
        res.status(200).json(liveness);
    }
    catch (error) {
        res.status(503).json({
            status: 'not_alive',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
/**
 * Kubernetes readiness probe
 * GET /health/ready
 */
router.get('/health/ready', async (req, res) => {
    try {
        const readiness = await (0, health_js_1.readinessProbe)();
        const statusCode = readiness.status === 'ready' ? 200 : 503;
        res.status(statusCode).json(readiness);
    }
    catch (error) {
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
/**
 * System information endpoint
 * GET /health/info
 */
router.get('/health/info', (req, res) => {
    const info = {
        service: 'intelgraph-server',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        pid: process.pid,
        memory: {
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024),
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
    };
    res.json(info);
});
/**
 * Individual service health checks
 */
// Database health
router.get('/health/database', async (req, res) => {
    try {
        const dbHealth = await (0, health_js_1.checkDatabase)();
        const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(dbHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
// Neo4j health
router.get('/health/neo4j', async (req, res) => {
    try {
        const neo4jHealth = await (0, health_js_1.checkNeo4j)();
        const statusCode = neo4jHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(neo4jHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
// Redis health
router.get('/health/redis', async (req, res) => {
    try {
        const redisHealth = await (0, health_js_1.checkRedis)();
        const statusCode = redisHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(redisHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
// ML service health
router.get('/health/ml', async (req, res) => {
    try {
        const mlHealth = await (0, health_js_1.checkMlService)();
        const statusCode = mlHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(mlHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
// System resources health
router.get('/health/system', (req, res) => {
    try {
        const systemHealth = (0, health_js_1.checkSystemResources)();
        const statusCode = systemHealth.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(systemHealth);
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
/**
 * Collect Web Vitals metrics from clients
 * POST /web-vitals
 */
router.post('/web-vitals', (req, res) => {
    const { name, value, id } = req.body || {};
    if (typeof name !== 'string' || typeof value !== 'number') {
        return res.status(400).json({ error: 'Invalid web vitals payload' });
    }
    try {
        metrics_js_1.webVitalValue.set({ metric: name, id: id || 'unknown' }, value);
        res.status(204).end();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to record web vital', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=monitoring.js.map