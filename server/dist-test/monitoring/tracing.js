"use strict";
/**
 * Basic Tracing and Instrumentation Service
 * Simple tracing implementation without OpenTelemetry dependencies
 * Can be upgraded to full OpenTelemetry when packages are installed
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { v4: uuidv4 } = require('uuid');
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class TracingService {
    constructor() {
        this.config = {
            enabled: process.env.TRACING_ENABLED !== '0',
            serviceName: process.env.SERVICE_NAME || 'intelgraph-api',
            environment: process.env.NODE_ENV || 'development',
            sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE) || 1.0,
            maxSpanDuration: parseInt(process.env.MAX_SPAN_DURATION) || 300000 // 5 minutes
        };
        this.activeSpans = new Map();
        this.completedSpans = [];
        this.metrics = {
            totalSpans: 0,
            activeSpanCount: 0,
            averageSpanDuration: 0,
            errorCount: 0
        };
    }
    /**
     * Create a new trace span
     */
    startSpan(name, options = {}) {
        if (!this.config.enabled || Math.random() > this.config.sampleRate) {
            return this.createNoOpSpan();
        }
        const span = {
            id: uuidv4(),
            name,
            startTime: Date.now(),
            endTime: null,
            duration: null,
            status: 'active',
            attributes: {
                service: this.config.serviceName,
                environment: this.config.environment,
                ...options.attributes
            },
            events: [],
            error: null,
            parentId: options.parentId || null
        };
        this.activeSpans.set(span.id, span);
        this.metrics.totalSpans++;
        this.metrics.activeSpanCount++;
        logger_js_1.default.debug('Span started', {
            spanId: span.id,
            name: span.name,
            parentId: span.parentId
        });
        return {
            id: span.id,
            setAttributes: (attributes) => this.setSpanAttributes(span.id, attributes),
            addEvent: (name, attributes) => this.addSpanEvent(span.id, name, attributes),
            setStatus: (status) => this.setSpanStatus(span.id, status),
            recordException: (error) => this.recordSpanException(span.id, error),
            end: () => this.endSpan(span.id)
        };
    }
    /**
     * Create a no-op span when tracing is disabled
     */
    createNoOpSpan() {
        return {
            id: 'noop',
            setAttributes: () => { },
            addEvent: () => { },
            setStatus: () => { },
            recordException: () => { },
            end: () => { }
        };
    }
    /**
     * End a span
     */
    endSpan(spanId) {
        const span = this.activeSpans.get(spanId);
        if (!span)
            return;
        span.endTime = Date.now();
        span.duration = span.endTime - span.startTime;
        span.status = span.error ? 'error' : 'ok';
        this.activeSpans.delete(spanId);
        this.completedSpans.push(span);
        this.metrics.activeSpanCount--;
        // Update average duration
        const totalDuration = this.completedSpans.reduce((sum, s) => sum + s.duration, 0);
        this.metrics.averageSpanDuration = totalDuration / this.completedSpans.length;
        // Keep only recent spans to prevent memory leak
        if (this.completedSpans.length > 1000) {
            this.completedSpans = this.completedSpans.slice(-500);
        }
        logger_js_1.default.debug('Span ended', {
            spanId: span.id,
            name: span.name,
            duration: span.duration,
            status: span.status
        });
        // Log long-running spans
        if (span.duration > 10000) { // 10 seconds
            logger_js_1.default.warn('Long-running span detected', {
                spanId: span.id,
                name: span.name,
                duration: span.duration,
                attributes: span.attributes
            });
        }
    }
    /**
     * Set span attributes
     */
    setSpanAttributes(spanId, attributes) {
        const span = this.activeSpans.get(spanId);
        if (span) {
            span.attributes = { ...span.attributes, ...attributes };
        }
    }
    /**
     * Add event to span
     */
    addSpanEvent(spanId, name, attributes = {}) {
        const span = this.activeSpans.get(spanId);
        if (span) {
            span.events.push({
                name,
                timestamp: Date.now(),
                attributes
            });
        }
    }
    /**
     * Set span status
     */
    setSpanStatus(spanId, status) {
        const span = this.activeSpans.get(spanId);
        if (span) {
            span.status = status.code === 2 ? 'error' : 'ok';
            if (status.message) {
                span.attributes.statusMessage = status.message;
            }
        }
    }
    /**
     * Record exception in span
     */
    recordSpanException(spanId, error) {
        const span = this.activeSpans.get(spanId);
        if (span) {
            span.error = {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
            span.status = 'error';
            this.metrics.errorCount++;
            logger_js_1.default.error('Span exception recorded', {
                spanId: span.id,
                name: span.name,
                error: error.message
            });
        }
    }
    /**
     * Trace an async function
     */
    async traceAsync(name, fn, options = {}) {
        const span = this.startSpan(name, options);
        try {
            const result = await fn(span);
            span.setStatus({ code: 1 }); // OK
            return result;
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message }); // ERROR
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Trace a synchronous function
     */
    traceSync(name, fn, options = {}) {
        const span = this.startSpan(name, options);
        try {
            const result = fn(span);
            span.setStatus({ code: 1 }); // OK
            return result;
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message }); // ERROR
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Express middleware for request tracing
     */
    expressMiddleware() {
        return (req, res, next) => {
            if (!this.config.enabled) {
                return next();
            }
            const span = this.startSpan(`${req.method} ${req.route?.path || req.path}`, {
                attributes: {
                    'http.method': req.method,
                    'http.url': req.originalUrl,
                    'http.path': req.path,
                    'http.user_agent': req.get('User-Agent'),
                    'http.remote_addr': req.ip,
                    'user.id': req.user?.id
                }
            });
            // Store span in request
            req.traceSpan = span;
            // Override res.end to capture response details
            const originalEnd = res.end;
            res.end = function (...args) {
                span.setAttributes({
                    'http.status_code': res.statusCode,
                    'http.response.content_length': res.get('content-length')
                });
                if (res.statusCode >= 400) {
                    span.setStatus({ code: 2, message: `HTTP ${res.statusCode}` });
                }
                else {
                    span.setStatus({ code: 1 });
                }
                span.end();
                originalEnd.apply(this, args);
            };
            next();
        };
    }
    /**
     * GraphQL resolver wrapper
     */
    wrapResolver(resolverName, originalResolver) {
        return async (parent, args, context, info) => {
            if (!this.config.enabled) {
                return originalResolver(parent, args, context, info);
            }
            const operationType = info.operation.operation;
            const fieldName = info.fieldName;
            const spanName = `GraphQL ${operationType}: ${fieldName}`;
            return this.traceAsync(spanName, async (span) => {
                span.setAttributes({
                    'graphql.operation.type': operationType,
                    'graphql.field.name': fieldName,
                    'graphql.operation.name': info.operation.name?.value,
                    'user.id': context.user?.id,
                    'graphql.resolver': resolverName
                });
                const result = await originalResolver(parent, args, context, info);
                // Add result metadata
                if (result && typeof result === 'object') {
                    if (Array.isArray(result)) {
                        span.setAttributes({ 'graphql.result.count': result.length });
                    }
                    else if (result.success !== undefined) {
                        span.setAttributes({ 'graphql.result.success': result.success });
                    }
                }
                return result;
            }, {
                attributes: { resolver: resolverName }
            });
        };
    }
    /**
     * Database operation tracing
     */
    async traceDbOperation(operation, query, params = {}) {
        return this.traceAsync(`db.${operation}`, async (span) => {
            span.setAttributes({
                'db.operation': operation,
                'db.statement': typeof query === 'string' ? query.substring(0, 500) : 'complex-query',
                'db.system': 'neo4j'
            });
            if (params.investigationId) {
                span.setAttributes({ 'investigation.id': params.investigationId });
            }
            // Return span so caller can add more attributes
            return span;
        });
    }
    /**
     * Get recent traces for debugging
     */
    getRecentTraces(limit = 50) {
        return this.completedSpans
            .slice(-limit)
            .map(span => ({
            id: span.id,
            name: span.name,
            duration: span.duration,
            status: span.status,
            startTime: new Date(span.startTime).toISOString(),
            attributes: span.attributes,
            events: span.events,
            error: span.error
        }));
    }
    /**
     * Get active spans (for debugging)
     */
    getActiveSpans() {
        return Array.from(this.activeSpans.values()).map(span => ({
            id: span.id,
            name: span.name,
            duration: Date.now() - span.startTime,
            attributes: span.attributes
        }));
    }
    /**
     * Clean up old spans
     */
    cleanup() {
        const now = Date.now();
        const maxAge = this.config.maxSpanDuration;
        // Clean up stale active spans
        for (const [spanId, span] of this.activeSpans.entries()) {
            if (now - span.startTime > maxAge) {
                logger_js_1.default.warn('Cleaning up stale span', {
                    spanId: span.id,
                    name: span.name,
                    age: now - span.startTime
                });
                span.attributes.stale = true;
                this.endSpan(spanId);
            }
        }
    }
    /**
     * Export traces (for external systems)
     */
    exportTraces(format = 'json') {
        const traces = this.getRecentTraces(100);
        if (format === 'jaeger') {
            // Convert to Jaeger format
            return {
                data: traces.map(trace => ({
                    traceID: trace.id.replace(/-/g, ''),
                    spanID: trace.id.replace(/-/g, '').substring(0, 16),
                    operationName: trace.name,
                    startTime: new Date(trace.startTime).getTime() * 1000, // microseconds
                    duration: trace.duration * 1000, // microseconds
                    tags: Object.entries(trace.attributes).map(([key, value]) => ({
                        key,
                        type: typeof value === 'string' ? 'string' : 'number',
                        value: value.toString()
                    })),
                    process: {
                        serviceName: this.config.serviceName,
                        tags: [
                            { key: 'environment', value: this.config.environment, type: 'string' }
                        ]
                    }
                }))
            };
        }
        return { traces };
    }
    /**
     * Health check
     */
    getHealth() {
        return {
            status: this.config.enabled ? 'healthy' : 'disabled',
            metrics: {
                totalSpans: this.metrics.totalSpans,
                activeSpanCount: this.metrics.activeSpanCount,
                averageSpanDuration: Math.round(this.metrics.averageSpanDuration),
                errorCount: this.metrics.errorCount,
                completedSpanCount: this.completedSpans.length
            },
            config: {
                enabled: this.config.enabled,
                serviceName: this.config.serviceName,
                environment: this.config.environment,
                sampleRate: this.config.sampleRate
            }
        };
    }
    /**
     * Start cleanup interval
     */
    startCleanupInterval(intervalMs = 60000) {
        setInterval(() => {
            this.cleanup();
        }, intervalMs);
    }
}
// Create singleton instance
const tracingService = new TracingService();
// Start cleanup interval
tracingService.startCleanupInterval();
module.exports = tracingService;
//# sourceMappingURL=tracing.js.map