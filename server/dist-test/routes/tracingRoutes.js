"use strict";
/**
 * Tracing API Routes
 * Endpoints for accessing tracing information and metrics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const tracingService = require('../monitoring/tracing');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiting');
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const router = express.Router();
// Apply authentication and rate limiting
router.use(ensureAuthenticated);
router.use(rateLimiter({ windowMs: 60000, max: 50 })); // 50 requests per minute
/**
 * @swagger
 * /api/tracing/health:
 *   get:
 *     summary: Get tracing service health and metrics
 *     tags: [Tracing]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tracing health status
 */
router.get('/health', async (req, res) => {
    try {
        const health = tracingService.getHealth();
        res.json({
            ...health,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_js_1.default.error('Failed to get tracing health', {
            userId: req.user?.id,
            error: error.message
        });
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * @swagger
 * /api/tracing/traces:
 *   get:
 *     summary: Get recent traces
 *     tags: [Tracing]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *     responses:
 *       200:
 *         description: Recent traces
 */
router.get('/traces', requirePermission('tracing:read'), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const traces = tracingService.getRecentTraces(limit);
        logger_js_1.default.info('Traces retrieved', {
            userId: req.user?.id,
            traceCount: traces.length,
            limit
        });
        res.json({
            traces,
            count: traces.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_js_1.default.error('Failed to get traces', {
            userId: req.user?.id,
            error: error.message
        });
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * @swagger
 * /api/tracing/active:
 *   get:
 *     summary: Get currently active spans
 *     tags: [Tracing]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Active spans
 */
router.get('/active', requirePermission('tracing:read'), async (req, res) => {
    try {
        const activeSpans = tracingService.getActiveSpans();
        res.json({
            activeSpans,
            count: activeSpans.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_js_1.default.error('Failed to get active spans', {
            userId: req.user?.id,
            error: error.message
        });
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * @swagger
 * /api/tracing/export:
 *   get:
 *     summary: Export traces in various formats
 *     tags: [Tracing]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: format
 *         in: query
 *         schema:
 *           type: string
 *           enum: [json, jaeger]
 *           default: json
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *     responses:
 *       200:
 *         description: Exported traces
 */
router.get('/export', requirePermission('tracing:manage'), async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        // Temporarily set the limit for export
        const originalTraces = tracingService.completedSpans.slice(-limit);
        const exported = tracingService.exportTraces(format);
        logger_js_1.default.info('Traces exported', {
            userId: req.user?.id,
            format,
            traceCount: limit
        });
        if (format === 'jaeger') {
            res.json(exported);
        }
        else {
            res.json({
                ...exported,
                metadata: {
                    format,
                    exportedAt: new Date().toISOString(),
                    traceCount: exported.traces?.length || 0
                }
            });
        }
    }
    catch (error) {
        logger_js_1.default.error('Failed to export traces', {
            userId: req.user?.id,
            error: error.message
        });
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * @swagger
 * /api/tracing/metrics:
 *   get:
 *     summary: Get tracing metrics in Prometheus format
 *     tags: [Tracing]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/metrics', async (req, res) => {
    try {
        const health = tracingService.getHealth();
        const metrics = health.metrics;
        // Generate Prometheus format metrics
        const prometheusMetrics = `
# HELP intelgraph_traces_total Total number of traces
# TYPE intelgraph_traces_total counter
intelgraph_traces_total ${metrics.totalSpans}

# HELP intelgraph_traces_active Currently active traces
# TYPE intelgraph_traces_active gauge
intelgraph_traces_active ${metrics.activeSpanCount}

# HELP intelgraph_traces_duration_avg Average trace duration in milliseconds
# TYPE intelgraph_traces_duration_avg gauge
intelgraph_traces_duration_avg ${metrics.averageSpanDuration}

# HELP intelgraph_traces_errors_total Total number of trace errors
# TYPE intelgraph_traces_errors_total counter
intelgraph_traces_errors_total ${metrics.errorCount}

# HELP intelgraph_traces_completed_total Total number of completed traces
# TYPE intelgraph_traces_completed_total counter
intelgraph_traces_completed_total ${metrics.completedSpanCount}
`.trim();
        res.set('Content-Type', 'text/plain');
        res.send(prometheusMetrics);
    }
    catch (error) {
        logger_js_1.default.error('Failed to generate metrics', {
            userId: req.user?.id,
            error: error.message
        });
        res.status(500).send('# Error generating metrics\n');
    }
});
/**
 * @swagger
 * /api/tracing/config:
 *   get:
 *     summary: Get tracing configuration
 *     tags: [Tracing]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tracing configuration
 */
router.get('/config', requirePermission('tracing:manage'), async (req, res) => {
    try {
        const health = tracingService.getHealth();
        res.json({
            config: health.config,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_js_1.default.error('Failed to get tracing config', {
            userId: req.user?.id,
            error: error.message
        });
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
/**
 * @swagger
 * /api/tracing/cleanup:
 *   post:
 *     summary: Trigger manual cleanup of stale spans
 *     tags: [Tracing]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed
 */
router.post('/cleanup', requirePermission('tracing:manage'), async (req, res) => {
    try {
        const beforeCount = tracingService.getHealth().metrics.activeSpanCount;
        tracingService.cleanup();
        const afterCount = tracingService.getHealth().metrics.activeSpanCount;
        logger_js_1.default.info('Manual tracing cleanup triggered', {
            userId: req.user?.id,
            beforeCount,
            afterCount,
            cleaned: beforeCount - afterCount
        });
        res.json({
            success: true,
            beforeCount,
            afterCount,
            cleanedSpans: beforeCount - afterCount,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        logger_js_1.default.error('Failed to cleanup traces', {
            userId: req.user?.id,
            error: error.message
        });
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
module.exports = router;
//# sourceMappingURL=tracingRoutes.js.map