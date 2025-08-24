"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performHealthCheck = performHealthCheck;
exports.getCachedHealthStatus = getCachedHealthStatus;
exports.livenessProbe = livenessProbe;
exports.readinessProbe = readinessProbe;
exports.checkDatabase = checkDatabase;
exports.checkNeo4j = checkNeo4j;
exports.checkRedis = checkRedis;
exports.checkMlService = checkMlService;
exports.checkSystemResources = checkSystemResources;
/**
 * Health check endpoints and monitoring
 */
const os_1 = __importDefault(require("os"));
const perf_hooks_1 = require("perf_hooks");
const metrics_js_1 = require("./metrics.js");
// Health check status cache
let healthStatus = {
    status: "unknown",
    timestamp: new Date().toISOString(),
    checks: {},
};
/**
 * Check database connectivity
 */
async function checkDatabase() {
    try {
        // Check PostgreSQL connection
        const { Pool } = await Promise.resolve().then(() => __importStar(require('pg')));
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 1,
            connectionTimeoutMillis: 5000,
        });
        const start = perf_hooks_1.performance.now();
        const result = await pool.query("SELECT 1 as healthy");
        const responseTime = perf_hooks_1.performance.now() - start;
        await pool.end();
        return {
            status: "healthy",
            responseTime: Math.round(responseTime),
            details: "PostgreSQL connection successful",
        };
    }
    catch (error) {
        return {
            status: "unhealthy",
            error: error.message,
            details: "PostgreSQL connection failed",
        };
    }
}
/**
 * Check Neo4j connectivity
 */
async function checkNeo4j() {
    let driver;
    let session;
    const start = perf_hooks_1.performance.now();
    try {
        const neo4j = await Promise.resolve().then(() => __importStar(require('neo4j-driver')));
        const driver = neo4j.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "password"), { connectionTimeout: 5000 });
        session = driver.session();
        await session.run("RETURN 1 as healthy");
        const responseTime = perf_hooks_1.performance.now() - start;
        metrics_js_1.dbQueryDuration
            .labels("neo4j", "health")
            .observe(responseTime / 1000);
        metrics_js_1.dbQueriesTotal.labels("neo4j", "health", "success").inc();
        await session.close();
        await driver.close();
        return {
            status: "healthy",
            responseTime: Math.round(responseTime),
            details: "Neo4j connection successful",
        };
    }
    catch (error) {
        const responseTime = perf_hooks_1.performance.now() - start;
        metrics_js_1.dbQueryDuration
            .labels("neo4j", "health")
            .observe(responseTime / 1000);
        metrics_js_1.dbQueriesTotal.labels("neo4j", "health", "error").inc();
        if (session)
            await session.close();
        if (driver)
            await driver.close();
        return {
            status: "unhealthy",
            error: error.message,
            details: "Neo4j connection failed",
        };
    }
}
/**
 * Check Redis connectivity
 */
async function checkRedis() {
    try {
        const Redis = (await Promise.resolve().then(() => __importStar(require('ioredis')))).default;
        const redis = new Redis({
            host: process.env.REDIS_HOST || "localhost",
            port: process.env.REDIS_PORT || 6379,
            connectTimeout: 5000,
            lazyConnect: true,
        });
        const start = perf_hooks_1.performance.now();
        await redis.ping();
        const responseTime = perf_hooks_1.performance.now() - start;
        redis.disconnect();
        return {
            status: "healthy",
            responseTime: Math.round(responseTime),
            details: "Redis connection successful",
        };
    }
    catch (error) {
        return {
            status: "unhealthy",
            error: error.message,
            details: "Redis connection failed",
        };
    }
}
/**
 * Check ML service connectivity
 */
async function checkMlService() {
    try {
        const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
        const start = perf_hooks_1.performance.now();
        const response = await fetch(`${mlServiceUrl}/health`, {
            timeout: 5000,
        });
        const responseTime = perf_hooks_1.performance.now() - start;
        if (response.ok) {
            const data = await response.json();
            return {
                status: "healthy",
                responseTime: Math.round(responseTime),
                details: "ML service reachable",
                mlServiceStatus: data.status,
            };
        }
        else {
            return {
                status: "unhealthy",
                responseTime: Math.round(responseTime),
                details: `ML service returned ${response.status}`,
            };
        }
    }
    catch (error) {
        return {
            status: "unhealthy",
            error: error.message,
            details: "ML service unreachable",
        };
    }
}
/**
 * Check system resources
 */
function checkSystemResources() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os_1.default.totalmem();
    const freeMemory = os_1.default.freemem();
    const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    const cpuUsage = process.cpuUsage();
    const loadAverage = os_1.default.loadavg();
    const status = memoryUsagePercent > 90 ? "unhealthy" : "healthy";
    return {
        status,
        memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // MB
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            systemMemoryUsagePercent: Math.round(memoryUsagePercent),
        },
        cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system,
            loadAverage: loadAverage.map((load) => Math.round(load * 100) / 100),
        },
        uptime: Math.round(process.uptime()),
        details: status === "healthy"
            ? "System resources within limits"
            : "High memory usage detected",
    };
}
/**
 * Perform comprehensive health check
 */
async function performHealthCheck() {
    const startTime = perf_hooks_1.performance.now();
    try {
        const [database, neo4j, redis, mlService, systemResources] = await Promise.allSettled([
            checkDatabase(),
            checkNeo4j(),
            checkRedis(),
            checkMlService(),
            Promise.resolve(checkSystemResources()),
        ]);
        const checks = {
            database: database.status === "fulfilled"
                ? database.value
                : { status: "unhealthy", error: database.reason?.message },
            neo4j: neo4j.status === "fulfilled"
                ? neo4j.value
                : { status: "unhealthy", error: neo4j.reason?.message },
            redis: redis.status === "fulfilled"
                ? redis.value
                : { status: "unhealthy", error: redis.reason?.message },
            mlService: mlService.status === "fulfilled"
                ? mlService.value
                : { status: "unhealthy", error: mlService.reason?.message },
            systemResources: systemResources.status === "fulfilled"
                ? systemResources.value
                : { status: "unhealthy", error: systemResources.reason?.message },
        };
        const allHealthy = Object.values(checks).every((check) => check.status === "healthy");
        const overallStatus = allHealthy ? "healthy" : "unhealthy";
        const totalTime = Math.round(perf_hooks_1.performance.now() - startTime);
        healthStatus = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            responseTime: totalTime,
            version: process.env.npm_package_version || "1.0.0",
            environment: process.env.NODE_ENV || "development",
            checks,
        };
        return healthStatus;
    }
    catch (error) {
        healthStatus = {
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: error.message,
            checks: {},
        };
        return healthStatus;
    }
}
/**
 * Get cached health status (for faster responses)
 */
function getCachedHealthStatus() {
    return healthStatus;
}
/**
 * Liveness probe - simpler check for Kubernetes
 */
async function livenessProbe() {
    return {
        status: "alive",
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        pid: process.pid,
    };
}
/**
 * Readiness probe - check if ready to serve traffic
 */
async function readinessProbe() {
    try {
        // Quick checks for critical dependencies
        const dbCheck = await checkDatabase();
        const redisCheck = await checkRedis();
        const ready = dbCheck.status === "healthy" && redisCheck.status === "healthy";
        return {
            status: ready ? "ready" : "not_ready",
            timestamp: new Date().toISOString(),
            checks: {
                database: dbCheck.status,
                redis: redisCheck.status,
            },
        };
    }
    catch (error) {
        return {
            status: "not_ready",
            timestamp: new Date().toISOString(),
            error: error.message,
        };
    }
}
// Update health status every 30 seconds
const healthCheckInterval = setInterval(async () => {
    try {
        await performHealthCheck();
    }
    catch (error) {
        console.error("Health check error:", error);
    }
}, 30000);
// Cleanup interval on process exit
process.on("SIGTERM", () => {
    clearInterval(healthCheckInterval);
});
//# sourceMappingURL=health.js.map