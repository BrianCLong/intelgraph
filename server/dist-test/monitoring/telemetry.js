"use strict";
/**
 * OpenTelemetry Configuration for IntelGraph
 * Provides distributed tracing, metrics, and logging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class TelemetryService {
    constructor() {
        this.sdk = null;
        this.tracer = null;
        this.initialized = false;
        this.config = {
            serviceName: process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
            serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
            prometheusPort: parseInt(process.env.PROMETHEUS_PORT) || 9464,
            enabled: process.env.OTEL_ENABLED !== '0'
        };
        this.userPathCounter = null;
        this.clickCounter = null;
        this.dwellHistogram = null;
        this.aiInteractionCounter = null;
    }
    /**
     * Initialize OpenTelemetry SDK
     */
    initialize() {
        if (!this.config.enabled) {
            logger_js_1.default.info('OpenTelemetry disabled via OTEL_ENABLED=0');
            return;
        }
        try {
            // Resource configuration
            const resource = new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
                [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
            });
            // Jaeger exporter for traces
            const jaegerExporter = new JaegerExporter({
                endpoint: this.config.jaegerEndpoint,
            });
            // Prometheus exporter for metrics
            const prometheusExporter = new PrometheusExporter({
                port: this.config.prometheusPort,
                preventServerStart: false
            });
            // Initialize SDK
            this.sdk = new NodeSDK({
                resource,
                traceExporter: jaegerExporter,
                metricReader: new PeriodicExportingMetricReader({
                    exporter: prometheusExporter,
                    exportIntervalMillis: 10000
                }),
                instrumentations: [
                    getNodeAutoInstrumentations({
                        // Disable some instrumentations that might be noisy
                        '@opentelemetry/instrumentation-fs': {
                            enabled: false,
                        },
                        '@opentelemetry/instrumentation-dns': {
                            enabled: false,
                        },
                        // Configure HTTP instrumentation
                        '@opentelemetry/instrumentation-http': {
                            enabled: true,
                            ignoreIncomingRequestHook: (req) => {
                                // Ignore health checks and metrics endpoints
                                return req.url?.includes('/health') || req.url?.includes('/metrics');
                            }
                        },
                        // Configure Express instrumentation
                        '@opentelemetry/instrumentation-express': {
                            enabled: true,
                        },
                        // Configure GraphQL instrumentation
                        '@opentelemetry/instrumentation-graphql': {
                            enabled: true,
                            depth: 10,
                            allowValues: process.env.NODE_ENV === 'development'
                        },
                        // Configure database instrumentations
                        '@opentelemetry/instrumentation-redis': {
                            enabled: true,
                        }
                    }),
                ],
            });
            this.sdk.start();
            this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
            this.initialized = true;
            this.userPathCounter = this.createCounter('user_path', 'User navigation between nodes');
            this.clickCounter = this.createCounter('clickstream', 'User click events');
            this.dwellHistogram = this.createHistogram('dwell_time', 'Time spent on nodes', 'ms');
            this.aiInteractionCounter = this.createCounter('ai_interactions', 'AI model interactions');
            logger_js_1.default.info('OpenTelemetry initialized', {
                serviceName: this.config.serviceName,
                serviceVersion: this.config.serviceVersion,
                environment: this.config.environment,
                jaegerEndpoint: this.config.jaegerEndpoint,
                prometheusPort: this.config.prometheusPort
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize OpenTelemetry', {
                error: error.message
            });
        }
    }
    /**
     * Gracefully shutdown telemetry
     */
    async shutdown() {
        if (this.sdk) {
            try {
                await this.sdk.shutdown();
                logger_js_1.default.info('OpenTelemetry SDK shutdown completed');
            }
            catch (error) {
                logger_js_1.default.error('Error shutting down OpenTelemetry SDK', {
                    error: error.message
                });
            }
        }
    }
    /**
     * Create and start a new span
     */
    startSpan(name, options = {}) {
        if (!this.initialized || !this.tracer) {
            return {
                end: () => { },
                setStatus: () => { },
                setAttributes: () => { },
                addEvent: () => { },
                recordException: () => { }
            };
        }
        return this.tracer.startSpan(name, options);
    }
    /**
     * Trace a function with automatic span management
     */
    async traceAsync(name, fn, options = {}) {
        const span = this.startSpan(name, options);
        try {
            const result = await context.with(trace.setSpan(context.active(), span), async () => {
                return await fn(span);
            });
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message
            });
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
            const result = context.with(trace.setSpan(context.active(), span), () => {
                return fn(span);
            });
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message
            });
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Express middleware for tracing HTTP requests
     */
    expressMiddleware() {
        return (req, res, next) => {
            if (!this.initialized) {
                return next();
            }
            const span = this.startSpan(`${req.method} ${req.route?.path || req.path}`, {
                kind: 1, // SpanKind.SERVER
                attributes: {
                    'http.method': req.method,
                    'http.url': req.url,
                    'http.route': req.route?.path,
                    'user.id': req.user?.id,
                    'http.user_agent': req.get('User-Agent')
                }
            });
            // Store span in request for access in resolvers
            req.span = span;
            const originalEnd = res.end;
            res.end = function (...args) {
                span.setAttributes({
                    'http.status_code': res.statusCode,
                    'http.response_size': res.get('content-length')
                });
                if (res.statusCode >= 400) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: `HTTP ${res.statusCode}`
                    });
                }
                else {
                    span.setStatus({ code: SpanStatusCode.OK });
                }
                span.end();
                originalEnd.apply(this, args);
            };
            next();
        };
    }
    /**
     * GraphQL resolver wrapper for tracing
     */
    traceResolver(resolverName) {
        return (originalResolver) => {
            return async (parent, args, context, info) => {
                if (!this.initialized) {
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
                        'user.id': context.user?.id
                    });
                    const result = await originalResolver(parent, args, context, info);
                    // Add result metadata if available
                    if (result && typeof result === 'object') {
                        if (Array.isArray(result)) {
                            span.setAttributes({
                                'graphql.result.count': result.length
                            });
                        }
                        else if (result.success !== undefined) {
                            span.setAttributes({
                                'graphql.result.success': result.success
                            });
                        }
                    }
                    return result;
                });
            };
        };
    }
    /**
     * Database operation tracing
     */
    async traceDbOperation(operationType, query, params = {}) {
        return this.traceAsync(`db.${operationType}`, async (span) => {
            span.setAttributes({
                'db.operation': operationType,
                'db.statement': typeof query === 'string' ? query : JSON.stringify(query),
                'db.system': 'neo4j'
            });
            // The actual database operation should be performed by the caller
            return { span };
        });
    }
    trackUserPath(userId, fromNode, toNode) {
        this.userPathCounter?.add(1, { userId, fromNode, toNode });
    }
    recordClick(userId, element) {
        this.clickCounter?.add(1, { userId, element });
    }
    recordDwellTime(userId, nodeId, ms) {
        this.dwellHistogram?.record(ms, { userId, nodeId });
    }
    recordAiInteraction(userId, model, confidence, overridden = false) {
        this.aiInteractionCounter?.add(1, { userId, model, confidence, overridden });
    }
    /**
     * Create custom metrics
     */
    createCounter(name, description, unit = '1') {
        if (!this.initialized) {
            return {
                add: () => { },
                bind: () => ({ add: () => { } })
            };
        }
        const { metrics } = require('@opentelemetry/api');
        const meter = metrics.getMeter(this.config.serviceName, this.config.serviceVersion);
        return meter.createCounter(name, { description, unit });
    }
    createHistogram(name, description, unit = 'ms') {
        if (!this.initialized) {
            return {
                record: () => { },
                bind: () => ({ record: () => { } })
            };
        }
        const { metrics } = require('@opentelemetry/api');
        const meter = metrics.getMeter(this.config.serviceName, this.config.serviceVersion);
        return meter.createHistogram(name, { description, unit });
    }
    createGauge(name, description, unit = '1') {
        if (!this.initialized) {
            return {
                record: () => { },
                bind: () => ({ record: () => { } })
            };
        }
        const { metrics } = require('@opentelemetry/api');
        const meter = metrics.getMeter(this.config.serviceName, this.config.serviceVersion);
        return meter.createUpDownCounter(name, { description, unit });
    }
    /**
     * Health check
     */
    getHealth() {
        return {
            status: this.initialized ? 'healthy' : 'disabled',
            initialized: this.initialized,
            config: {
                serviceName: this.config.serviceName,
                serviceVersion: this.config.serviceVersion,
                environment: this.config.environment,
                enabled: this.config.enabled
            }
        };
    }
}
// Singleton instance
const telemetryService = new TelemetryService();
// Auto-initialize on require (but only once)
if (!telemetryService.initialized && telemetryService.config.enabled) {
    telemetryService.initialize();
}
module.exports = telemetryService;
//# sourceMappingURL=telemetry.js.map