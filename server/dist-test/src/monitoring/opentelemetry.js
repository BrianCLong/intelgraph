"use strict";
/**
 * OpenTelemetry Instrumentation
 *
 * Replaces custom tracing with industry-standard OpenTelemetry
 * for Apollo GraphQL, Neo4j, and BullMQ operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.otelService = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const api_1 = require("@opentelemetry/api");
const logger = logger.child({ name: 'opentelemetry' });
class OpenTelemetryService {
    constructor(config = {}) {
        this.sdk = null;
        this.tracer = null;
        this.config = {
            serviceName: config.serviceName || process.env.OTEL_SERVICE_NAME || 'intelgraph-api',
            serviceVersion: config.serviceVersion || process.env.OTEL_SERVICE_VERSION || '1.0.0',
            environment: config.environment || process.env.NODE_ENV || 'development',
            jaegerEndpoint: config.jaegerEndpoint || process.env.JAEGER_ENDPOINT,
            enableConsoleExporter: config.enableConsoleExporter ?? (process.env.NODE_ENV === 'development'),
            sampleRate: config.sampleRate ?? parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0')
        };
    }
    /**
     * Initialize OpenTelemetry SDK
     */
    initialize() {
        try {
            // Configure resource
            const resource = resources_1.Resource.default().merge(new resources_1.Resource({
                [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
                [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
                [semantic_conventions_1.SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
            }));
            // Configure exporters
            const traceExporters = [];
            if (this.config.jaegerEndpoint) {
                traceExporters.push(new exporter_jaeger_1.JaegerExporter({
                    endpoint: this.config.jaegerEndpoint,
                }));
            }
            // Configure metrics
            const metricReaders = [];
            // Prometheus metrics
            metricReaders.push(new exporter_prometheus_1.PrometheusExporter({
                port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
            }));
            // Initialize SDK
            this.sdk = new sdk_node_1.NodeSDK({
                resource,
                traceExporter: traceExporters.length > 0 ? traceExporters[0] : undefined,
                metricReader: metricReaders.length > 0 ? metricReaders[0] : undefined,
                instrumentations: [
                    (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                        // Disable instrumentation for certain modules if needed
                        '@opentelemetry/instrumentation-fs': {
                            enabled: false,
                        },
                    }),
                ],
            });
            // Start the SDK
            this.sdk.start();
            // Get tracer
            this.tracer = api_1.trace.getTracer(this.config.serviceName, this.config.serviceVersion);
            logger.info(`OpenTelemetry initialized. Service Name: ${this.config.serviceName}, Environment: ${this.config.environment}, Jaeger Enabled: ${!!this.config.jaegerEndpoint}`);
        }
        catch (error) {
            logger.error(`Failed to initialize OpenTelemetry. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Shutdown OpenTelemetry SDK
     */
    async shutdown() {
        if (this.sdk) {
            await this.sdk.shutdown();
            logger.info('OpenTelemetry SDK shutdown');
        }
    }
    /**
     * Start a new span with proper error handling
     */
    startSpan(name, attributes = {}, kind = api_1.SpanKind.INTERNAL) {
        if (!this.tracer) {
            return this.createNoOpSpan();
        }
        return this.tracer.startSpan(name, {
            kind,
            attributes: {
                'service.name': this.config.serviceName,
                'service.version': this.config.serviceVersion,
                'deployment.environment': this.config.environment,
                ...attributes
            }
        });
    }
    /**
     * Wrap a GraphQL resolver with tracing
     */
    wrapResolver(operationName, resolver) {
        return async (parent, args, context, info) => {
            const span = this.startSpan(`graphql.${operationName}`, {
                'graphql.operation.name': operationName,
                'graphql.operation.type': info.operation?.operation || 'unknown',
                'graphql.field.name': info.fieldName,
                'graphql.field.path': info.path?.key || 'unknown',
                'user.id': context.user?.id || 'anonymous'
            }, api_1.SpanKind.SERVER);
            try {
                const result = await resolver(parent, args, context, info);
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                span.setAttributes({
                    'graphql.result.success': true
                });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
                span.setAttributes({
                    'graphql.result.success': false,
                    'error.name': error instanceof Error ? error.constructor.name : 'Unknown',
                    'error.message': error instanceof Error ? error.message : 'Unknown error'
                });
                throw error;
            }
            finally {
                span.end();
            }
        };
    }
    /**
     * Wrap Neo4j operations with tracing
     */
    wrapNeo4jOperation(operationName, operation) {
        const span = this.startSpan(`neo4j.${operationName}`, {
            'db.system': 'neo4j',
            'db.operation': operationName
        }, api_1.SpanKind.CLIENT);
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), async () => {
            try {
                const result = await operation();
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Wrap BullMQ job processing with tracing
     */
    wrapBullMQJob(jobName, processor) {
        const span = this.startSpan(`bullmq.${jobName}`, {
            'messaging.system': 'redis',
            'messaging.operation': 'process',
            'job.name': jobName
        }, api_1.SpanKind.CONSUMER);
        return api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), async () => {
            try {
                const result = await processor();
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Add custom span attributes
     */
    addSpanAttributes(attributes) {
        const activeSpan = api_1.trace.getActiveSpan();
        if (activeSpan) {
            activeSpan.setAttributes(attributes);
        }
    }
    /**
     * Add span event
     */
    addSpanEvent(name, attributes) {
        const activeSpan = api_1.trace.getActiveSpan();
        if (activeSpan) {
            activeSpan.addEvent(name, attributes);
        }
    }
    /**
     * Get current trace context for propagation
     */
    getCurrentTraceContext() {
        const activeSpan = api_1.trace.getActiveSpan();
        if (activeSpan) {
            const spanContext = activeSpan.spanContext();
            return `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16)}`;
        }
        return undefined;
    }
    /**
     * Create no-op span for when tracing is disabled
     */
    createNoOpSpan() {
        return {
            setStatus: () => { },
            setAttributes: () => { },
            addEvent: () => { },
            end: () => { }
        };
    }
    /**
     * Get service health and metrics
     */
    getHealth() {
        return {
            enabled: !!this.sdk,
            serviceName: this.config.serviceName,
            environment: this.config.environment,
            tracerActive: !!this.tracer
        };
    }
}
// Global instance
exports.otelService = new OpenTelemetryService();
// Initialize if not in test environment
if (process.env.NODE_ENV !== 'test') {
    exports.otelService.initialize();
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.otelService.shutdown();
});
process.on('SIGINT', async () => {
    await exports.otelService.shutdown();
});
exports.default = exports.otelService;
//# sourceMappingURL=opentelemetry.js.map