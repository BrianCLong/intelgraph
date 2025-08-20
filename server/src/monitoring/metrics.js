/**
 * Prometheus metrics collection for IntelGraph Platform
 */
import * as client from "prom-client";

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({
  register,
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection buckets
});

// Custom Application Metrics

// HTTP Request metrics
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

// GraphQL metrics
const graphqlRequestDuration = new client.Histogram({
  name: "graphql_request_duration_seconds",
  help: "Duration of GraphQL requests in seconds",
  labelNames: ["operation", "operation_type"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const graphqlRequestsTotal = new client.Counter({
  name: "graphql_requests_total",
  help: "Total number of GraphQL requests",
  labelNames: ["operation", "operation_type", "status"],
});

const graphqlErrors = new client.Counter({
  name: "graphql_errors_total",
  help: "Total number of GraphQL errors",
  labelNames: ["operation", "error_type"],
});

// Explanation service metrics
const explanationRequestDuration = new client.Histogram({
  name: 'explanation_request_duration_seconds',
  help: 'Latency of explanation requests',
  buckets: [0.1, 0.5, 1, 1.5, 2, 5]
});

// Tenant isolation violations
const tenantScopeViolationsTotal = new client.Counter({
  name: "tenant_scope_violations_total",
  help: "Total number of tenant scope violations",
});

// Database metrics
const dbConnectionsActive = new client.Gauge({
  name: "db_connections_active",
  help: "Number of active database connections",
  labelNames: ["database"],
});

const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["database", "operation"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const dbQueriesTotal = new client.Counter({
  name: "db_queries_total",
  help: "Total number of database queries",
  labelNames: ["database", "operation", "status"],
});

// AI/ML Processing metrics
const aiJobsQueued = new client.Gauge({
  name: "ai_jobs_queued",
  help: "Number of AI/ML jobs in queue",
  labelNames: ["job_type"],
});

const aiJobsProcessing = new client.Gauge({
  name: "ai_jobs_processing",
  help: "Number of AI/ML jobs currently processing",
  labelNames: ["job_type"],
});

const aiJobDuration = new client.Histogram({
  name: "ai_job_duration_seconds",
  help: "Duration of AI/ML job processing in seconds",
  labelNames: ["job_type", "status"],
  buckets: [1, 5, 10, 30, 60, 300, 600],
});

const aiJobsTotal = new client.Counter({
  name: "ai_jobs_total",
  help: "Total number of AI/ML jobs processed",
  labelNames: ["job_type", "status"],
});

// Graph operations metrics
const graphNodesTotal = new client.Gauge({
  name: "graph_nodes_total",
  help: "Total number of nodes in the graph",
  labelNames: ["investigation_id"],
});

const graphEdgesTotal = new client.Gauge({
  name: "graph_edges_total",
  help: "Total number of edges in the graph",
  labelNames: ["investigation_id"],
});

const graphOperationDuration = new client.Histogram({
  name: "graph_operation_duration_seconds",
  help: "Duration of graph operations in seconds",
  labelNames: ["operation", "investigation_id"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// WebSocket metrics
const websocketConnections = new client.Gauge({
  name: "websocket_connections_active",
  help: "Number of active WebSocket connections",
});

const websocketMessages = new client.Counter({
  name: "websocket_messages_total",
  help: "Total number of WebSocket messages",
  labelNames: ["direction", "event_type"],
});

// Investigation metrics
const investigationsActive = new client.Gauge({
  name: "investigations_active",
  help: "Number of active investigations",
});

const investigationOperations = new client.Counter({
  name: "investigation_operations_total",
  help: "Total number of investigation operations",
  labelNames: ["operation", "user_id"],
});

// Error tracking
const applicationErrors = new client.Counter({
  name: "application_errors_total",
  help: "Total number of application errors",
  labelNames: ["module", "error_type", "severity"],
});

// Memory usage for specific components
const memoryUsage = new client.Gauge({
  name: "application_memory_usage_bytes",
  help: "Memory usage by application component",
  labelNames: ["component"],
});

// Pipeline SLI metrics (labels: source, pipeline, env)
const pipelineUptimeRatio = new client.Gauge({
  name: "pipeline_uptime_ratio",
  help: "Pipeline availability ratio (0..1) over current window",
  labelNames: ["source", "pipeline", "env"],
});
const pipelineFreshnessSeconds = new client.Gauge({
  name: "pipeline_freshness_seconds",
  help: "Freshness (seconds) from source event to load completion",
  labelNames: ["source", "pipeline", "env"],
});
const pipelineCompletenessRatio = new client.Gauge({
  name: "pipeline_completeness_ratio",
  help: "Data completeness ratio (0..1) expected vs actual",
  labelNames: ["source", "pipeline", "env"],
});
const pipelineCorrectnessRatio = new client.Gauge({
  name: "pipeline_correctness_ratio",
  help: "Validation pass rate ratio (0..1)",
  labelNames: ["source", "pipeline", "env"],
});
const pipelineLatencySeconds = new client.Histogram({
  name: "pipeline_latency_seconds",
  help: "End-to-end processing latency seconds",
  labelNames: ["source", "pipeline", "env"],
  buckets: [5, 15, 30, 60, 120, 300, 600, 1200],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(graphqlRequestDuration);
register.registerMetric(graphqlRequestsTotal);
register.registerMetric(graphqlErrors);
register.registerMetric(explanationRequestDuration);
register.registerMetric(tenantScopeViolationsTotal);
register.registerMetric(dbConnectionsActive);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbQueriesTotal);
register.registerMetric(aiJobsQueued);
register.registerMetric(aiJobsProcessing);
register.registerMetric(aiJobDuration);
register.registerMetric(aiJobsTotal);
register.registerMetric(graphNodesTotal);
register.registerMetric(graphEdgesTotal);
register.registerMetric(graphOperationDuration);
register.registerMetric(websocketConnections);
register.registerMetric(websocketMessages);
register.registerMetric(investigationsActive);
register.registerMetric(investigationOperations);
register.registerMetric(applicationErrors);
register.registerMetric(memoryUsage);
register.registerMetric(pipelineUptimeRatio);
register.registerMetric(pipelineFreshnessSeconds);
register.registerMetric(pipelineCompletenessRatio);
register.registerMetric(pipelineCorrectnessRatio);
register.registerMetric(pipelineLatencySeconds);

// GraphRAG metrics for schema validation and caching
const graphragSchemaFailuresTotal = new client.Counter({
  name: "graphrag_schema_failures_total",
  help: "Total number of GraphRAG schema validation failures",
});
const graphragCacheHitRatio = new client.Gauge({
  name: "graphrag_cache_hit_ratio",
  help: "Ratio of GraphRAG cache hits to total requests",
});
register.registerMetric(graphragSchemaFailuresTotal);
register.registerMetric(graphragCacheHitRatio);
const pbacDecisionsTotal = new client.Counter({
  name: "pbac_decisions_total",
  help: "Total PBAC access decisions",
  labelNames: ["decision"],
});
register.registerMetric(pbacDecisionsTotal);
// New domain metrics
const graphExpandRequestsTotal = new client.Counter({
  name: "graph_expand_requests_total",
  help: "Total expandNeighbors requests",
  labelNames: ["cached"],
});
const aiRequestTotal = new client.Counter({
  name: "ai_request_total",
  help: "AI request events",
  labelNames: ["status"],
});
const resolverLatencyMs = new client.Histogram({
  name: "resolver_latency_ms",
  help: "Resolver latency in ms",
  labelNames: ["operation"],
  buckets: [5, 10, 25, 50, 100, 200, 400, 800, 1600],
});

const neighborhoodCacheHitRatio = new client.Gauge({
  name: "neighborhood_cache_hit_ratio",
  help: "Neighborhood cache hit ratio",
});

const neighborhoodCacheLatencyMs = new client.Histogram({
  name: "neighborhood_cache_latency_ms",
  help: "Neighborhood cache lookup latency in ms",
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

// Enhanced GraphQL resolver metrics
const graphqlResolverDurationSeconds = new client.Histogram({
  name: "graphql_resolver_duration_seconds",
  help: "Duration of GraphQL resolver execution in seconds",
  labelNames: ["resolver_name", "field_name", "type_name", "status"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const graphqlResolverErrorsTotal = new client.Counter({
  name: "graphql_resolver_errors_total",  
  help: "Total number of GraphQL resolver errors",
  labelNames: ["resolver_name", "field_name", "type_name", "error_type"],
});

const graphqlResolverCallsTotal = new client.Counter({
  name: "graphql_resolver_calls_total",
  help: "Total number of GraphQL resolver calls",
  labelNames: ["resolver_name", "field_name", "type_name"],
});
// Web Vitals metrics reported from clients
const webVitalValue = new client.Gauge({
  name: "web_vital_value",
  help: "Latest reported Web Vitals values",
  labelNames: ["metric", "id"],
});

// Real-time updates metrics
const realtimeConflictsTotal = new client.Counter({
  name: "realtime_conflicts_total",
  help: "Total number of real-time update conflicts (LWW)",
});

const idempotentHitsTotal = new client.Counter({
  name: "idempotent_hits_total",
  help: "Total number of idempotent mutation hits",
});

register.registerMetric(graphExpandRequestsTotal);
register.registerMetric(aiRequestTotal);
register.registerMetric(resolverLatencyMs);
register.registerMetric(neighborhoodCacheHitRatio);
register.registerMetric(neighborhoodCacheLatencyMs);
register.registerMetric(graphqlResolverDurationSeconds);
register.registerMetric(graphqlResolverErrorsTotal);
register.registerMetric(graphqlResolverCallsTotal);
register.registerMetric(webVitalValue);
register.registerMetric(realtimeConflictsTotal);
register.registerMetric(idempotentHitsTotal);

const metrics = {
  graphExpandRequestsTotal,
  aiRequestTotal,
  resolverLatencyMs,
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
  neighborhoodCacheHitRatio,
  neighborhoodCacheLatencyMs,
  pbacDecisionsTotal,
};

// Update memory usage periodically
setInterval(() => {
  const usage = process.memoryUsage();
  memoryUsage.set({ component: "heap_used" }, usage.heapUsed);
  memoryUsage.set({ component: "heap_total" }, usage.heapTotal);
  memoryUsage.set({ component: "external" }, usage.external);
  memoryUsage.set({ component: "rss" }, usage.rss);
}, 30000); // Every 30 seconds

export {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  graphqlRequestDuration,
  graphqlRequestsTotal,
  graphqlErrors,
  explanationRequestDuration,
  dbConnectionsActive,
  dbQueryDuration,
  dbQueriesTotal,
  aiJobsQueued,
  aiJobsProcessing,
  aiJobDuration,
  aiJobsTotal,
  graphNodesTotal,
  graphEdgesTotal,
  graphOperationDuration,
  websocketConnections,
  websocketMessages,
  investigationsActive,
  investigationOperations,
  applicationErrors,
  tenantScopeViolationsTotal,
  memoryUsage,
  graphExpandRequestsTotal,
  aiRequestTotal,
  resolverLatencyMs,
  neighborhoodCacheHitRatio,
  neighborhoodCacheLatencyMs,
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
  pbacDecisionsTotal,
  pipelineUptimeRatio,
  pipelineFreshnessSeconds,
  pipelineCompletenessRatio,
  pipelineCorrectnessRatio,
  pipelineLatencySeconds,
  graphqlResolverDurationSeconds,
  graphqlResolverErrorsTotal,
  graphqlResolverCallsTotal,
  webVitalValue,
  metrics,
};
