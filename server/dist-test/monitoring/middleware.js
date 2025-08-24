/**
 * Monitoring middleware for Express and GraphQL
 */
const { metrics } = require('./metrics');
/**
 * Express middleware to track HTTP request metrics
 */
function httpMetricsMiddleware(req, res, next) {
    const start = Date.now();
    // Track request count
    metrics.httpRequestsTotal.inc({
        method: req.method,
        route: req.route?.path || req.path || 'unknown',
        status_code: 'pending',
    });
    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path || 'unknown';
        // Update metrics
        metrics.httpRequestDuration.observe({
            method: req.method,
            route,
            status_code: res.statusCode,
        }, duration);
        // Update total counter with actual status
        metrics.httpRequestsTotal.inc({
            method: req.method,
            route,
            status_code: res.statusCode,
        });
        originalEnd.apply(this, args);
    };
    next();
}
/**
 * GraphQL middleware to track GraphQL operation metrics
 */
function graphqlMetricsMiddleware() {
    return {
        requestDidStart() {
            return {
                didResolveOperation(requestContext) {
                    const operationName = requestContext.request.operationName || 'anonymous';
                    const operationType = requestContext.operationName || 'unknown';
                    // Track GraphQL request
                    metrics.graphqlRequestsTotal.inc({
                        operation: operationName,
                        operation_type: operationType,
                        status: 'started',
                    });
                    requestContext.metrics = {
                        startTime: Date.now(),
                        operationName,
                        operationType,
                    };
                },
                didEncounterErrors(requestContext) {
                    const { operationName } = requestContext.metrics || {};
                    requestContext.errors.forEach(error => {
                        metrics.graphqlErrors.inc({
                            operation: operationName || 'unknown',
                            error_type: error.constructor.name || 'GraphQLError',
                        });
                    });
                },
                willSendResponse(requestContext) {
                    const metricData = requestContext.metrics;
                    if (!metricData)
                        return;
                    const duration = (Date.now() - metricData.startTime) / 1000;
                    const hasErrors = requestContext.errors && requestContext.errors.length > 0;
                    // Track GraphQL request duration
                    metrics.graphqlRequestDuration.observe({
                        operation: metricData.operationName,
                        operation_type: metricData.operationType,
                    }, duration);
                    // Update request status
                    metrics.graphqlRequestsTotal.inc({
                        operation: metricData.operationName,
                        operation_type: metricData.operationType,
                        status: hasErrors ? 'error' : 'success',
                    });
                },
            };
        },
    };
}
/**
 * Database query wrapper to track DB metrics
 */
function trackDbQuery(database, operation, queryFunction) {
    return async (...args) => {
        const start = Date.now();
        let status = 'success';
        try {
            const result = await queryFunction(...args);
            return result;
        }
        catch (error) {
            status = 'error';
            throw error;
        }
        finally {
            const duration = (Date.now() - start) / 1000;
            metrics.dbQueryDuration.observe({ database, operation }, duration);
            metrics.dbQueriesTotal.inc({
                database,
                operation,
                status,
            });
        }
    };
}
/**
 * AI job tracking wrapper
 */
function trackAiJob(jobType, jobFunction) {
    return async (...args) => {
        const start = Date.now();
        let status = 'success';
        // Increment queued counter
        metrics.aiJobsQueued.inc({ job_type: jobType });
        // Increment processing counter
        metrics.aiJobsProcessing.inc({ job_type: jobType });
        try {
            const result = await jobFunction(...args);
            return result;
        }
        catch (error) {
            status = 'error';
            throw error;
        }
        finally {
            const duration = (Date.now() - start) / 1000;
            // Decrement processing counter
            metrics.aiJobsProcessing.dec({ job_type: jobType });
            // Decrement queued counter
            metrics.aiJobsQueued.dec({ job_type: jobType });
            // Track job duration and completion
            metrics.aiJobDuration.observe({ job_type: jobType, status }, duration);
            metrics.aiJobsTotal.inc({
                job_type: jobType,
                status,
            });
        }
    };
}
/**
 * Graph operation tracking wrapper
 */
function trackGraphOperation(operation, investigationId, operationFunction) {
    return async (...args) => {
        const start = Date.now();
        try {
            const result = await operationFunction(...args);
            return result;
        }
        finally {
            const duration = (Date.now() - start) / 1000;
            metrics.graphOperationDuration.observe({ operation, investigation_id: investigationId }, duration);
        }
    };
}
/**
 * WebSocket connection tracking
 */
function trackWebSocketConnection(io) {
    io.on('connection', (socket) => {
        metrics.websocketConnections.inc();
        socket.on('disconnect', () => {
            metrics.websocketConnections.dec();
        });
        // Track messages
        socket.use((packet, next) => {
            const [eventType] = packet;
            metrics.websocketMessages.inc({
                direction: 'incoming',
                event_type: eventType,
            });
            next();
        });
        // Override emit to track outgoing messages
        const originalEmit = socket.emit;
        socket.emit = function (eventType, ...args) {
            metrics.websocketMessages.inc({
                direction: 'outgoing',
                event_type: eventType,
            });
            return originalEmit.apply(this, [eventType, ...args]);
        };
    });
}
/**
 * Error tracking wrapper
 */
function trackError(module, errorType, severity = 'error') {
    metrics.applicationErrors.inc({
        module,
        error_type: errorType,
        severity,
    });
}
/**
 * Investigation metrics tracking
 */
function updateInvestigationMetrics(investigationId, operation, userId) {
    metrics.investigationOperations.inc({
        operation,
        user_id: userId,
    });
}
module.exports = {
    httpMetricsMiddleware,
    graphqlMetricsMiddleware,
    trackDbQuery,
    trackAiJob,
    trackGraphOperation,
    trackWebSocketConnection,
    trackError,
    updateInvestigationMetrics,
};
//# sourceMappingURL=middleware.js.map