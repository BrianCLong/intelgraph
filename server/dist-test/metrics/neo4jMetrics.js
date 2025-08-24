"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.neo4jConnectivityUp = exports.neo4jQueryLatencyMs = exports.neo4jQueryErrorsTotal = exports.neo4jQueryTotal = void 0;
const prom_client_1 = require("prom-client");
const metrics_js_1 = require("../monitoring/metrics.js");
exports.neo4jQueryTotal = new prom_client_1.Counter({
    name: "neo4j_query_total",
    help: "Total number of Neo4j queries executed",
    labelNames: ["operation", "label"],
});
exports.neo4jQueryErrorsTotal = new prom_client_1.Counter({
    name: "neo4j_query_errors_total",
    help: "Total number of Neo4j query errors",
    labelNames: ["operation", "label"],
});
exports.neo4jQueryLatencyMs = new prom_client_1.Histogram({
    name: "neo4j_query_latency_ms",
    help: "Latency of Neo4j queries in milliseconds",
    labelNames: ["operation", "label"],
    buckets: [10, 20, 50, 100, 250, 500, 1000, 5000],
});
exports.neo4jConnectivityUp = new prom_client_1.Gauge({
    name: "neo4j_connectivity_up",
    help: "Neo4j connectivity status (1=up, 0=down)",
});
metrics_js_1.register.registerMetric(exports.neo4jQueryTotal);
metrics_js_1.register.registerMetric(exports.neo4jQueryErrorsTotal);
metrics_js_1.register.registerMetric(exports.neo4jQueryLatencyMs);
metrics_js_1.register.registerMetric(exports.neo4jConnectivityUp);
//# sourceMappingURL=neo4jMetrics.js.map