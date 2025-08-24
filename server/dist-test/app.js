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
exports.createApp = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const express4_1 = require("@as-integrations/express4");
const schema_1 = require("@graphql-tools/schema");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pino_http_1 = require("pino-http");
const audit_logger_js_1 = require("./middleware/audit-logger.js");
const monitoring_js_1 = __importDefault(require("./routes/monitoring.js"));
const ai_js_1 = __importDefault(require("./routes/ai.js"));
const metrics_js_1 = require("./monitoring/metrics.js");
const rbacRoutes_js_1 = __importDefault(require("./routes/rbacRoutes.js"));
const schema_js_1 = require("./graphql/schema.js");
const index_js_1 = __importDefault(require("./graphql/resolvers/index.js"));
const auth_js_1 = require("./lib/auth.js");
const neo4j_js_1 = require("./db/neo4j.js");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const logger_1 = __importDefault(require("./config/logger"));
const createApp = async () => {
    const __filename = (0, url_1.fileURLToPath)(import.meta.url);
    const __dirname = path_1.default.dirname(__filename);
    const app = (0, express_1.default)();
    const appLogger = logger_1.default.child({ name: 'app' });
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
        credentials: true,
    }));
    app.use((0, pino_http_1.pinoHttp)({ logger: appLogger, redact: ["req.headers.authorization"] }));
    app.use(audit_logger_js_1.auditLogger);
    // Rate limiting (exempt monitoring endpoints)
    app.use("/monitoring", monitoring_js_1.default);
    app.use("/api/ai", ai_js_1.default);
    app.use("/rbac", rbacRoutes_js_1.default);
    app.get("/metrics", async (_req, res) => {
        res.set("Content-Type", metrics_js_1.register.contentType);
        res.end(await metrics_js_1.register.metrics());
    });
    app.use((0, express_rate_limit_1.default)({
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
        max: Number(process.env.RATE_LIMIT_MAX || 600),
        message: { error: "Too many requests, please try again later" },
    }));
    app.get("/search/evidence", async (req, res) => {
        const { q, skip = 0, limit = 10 } = req.query;
        if (!q) {
            return res.status(400).send({ error: "Query parameter 'q' is required" });
        }
        const driver = (0, neo4j_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            const searchQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node, score
        RETURN node, score
        SKIP $skip
        LIMIT $limit
      `;
            const countQuery = `
        CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node
        RETURN count(node) as total
      `;
            const [searchResult, countResult] = await Promise.all([
                session.run(searchQuery, {
                    query: q,
                    skip: Number(skip),
                    limit: Number(limit),
                }),
                session.run(countQuery, { query: q }),
            ]);
            const evidence = searchResult.records.map((record) => ({
                node: record.get("node").properties,
                score: record.get("score"),
            }));
            const total = countResult.records[0].get("total").toNumber();
            res.send({
                data: evidence,
                metadata: {
                    total,
                    skip: Number(skip),
                    limit: Number(limit),
                    pages: Math.ceil(total / Number(limit)),
                    currentPage: Math.floor(Number(skip) / Number(limit)) + 1,
                },
            });
        }
        catch (error) {
            logger_1.default.error(`Error in search/evidence: ${error instanceof Error ? error.message : "Unknown error"}`);
            res.status(500).send({ error: "Internal server error" });
        }
        finally {
            await session.close();
        }
    });
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: schema_js_1.typeDefs, resolvers: index_js_1.default });
    // GraphQL over HTTP
    const { persistedQueriesPlugin } = await Promise.resolve().then(() => __importStar(require("./graphql/plugins/persistedQueries.js")));
    const { default: pbacPlugin } = await Promise.resolve().then(() => __importStar(require("./graphql/plugins/pbac.js")));
    const { default: resolverMetricsPlugin } = await Promise.resolve().then(() => __importStar(require("./graphql/plugins/resolverMetrics.js")));
    const { default: auditLoggerPlugin } = await Promise.resolve().then(() => __importStar(require("./graphql/plugins/auditLogger.js")));
    const { depthLimit } = await Promise.resolve().then(() => __importStar(require("./graphql/validation/depthLimit.js")));
    import { otelApolloPlugin } from './graphql/middleware/otelPlugin';
    const apollo = new server_1.ApolloServer({
        schema,
        // Security plugins - Order matters for execution lifecycle
        plugins: [
            (0, otelPlugin_1.otelApolloPlugin)(),
            persistedQueriesPlugin,
            resolverMetricsPlugin,
            auditLoggerPlugin,
            // Enable PBAC in production
            ...(process.env.NODE_ENV === 'production' ? [pbacPlugin()] : [])
        ],
        // Security configuration based on environment
        introspection: process.env.NODE_ENV !== "production",
        // Enhanced query validation rules
        validationRules: [
            depthLimit(process.env.NODE_ENV === 'production' ? 6 : 8), // Stricter in prod
        ],
        // Security context
        formatError: (err) => {
            // Don't expose internal errors in production
            if (process.env.NODE_ENV === 'production') {
                appLogger.error(`GraphQL Error: ${err.message}`, { stack: err.stack });
                return new Error('Internal server error');
            }
            return err;
        },
    });
    await apollo.start();
    // Production Authentication - Use proper JWT validation
    const { productionAuthMiddleware, applyProductionSecurity, graphqlSecurityConfig } = await Promise.resolve().then(() => __importStar(require('./config/production-security.js')));
    // Apply security middleware based on environment
    if (process.env.NODE_ENV === 'production') {
        applyProductionSecurity(app);
    }
    const authenticateToken = process.env.NODE_ENV === 'production'
        ? productionAuthMiddleware
        : (req, res, next) => {
            // Development mode - relaxed auth for easier testing
            const authHeader = req.headers["authorization"];
            const token = authHeader && authHeader.split(" ")[1];
            if (!token) {
                console.warn("Development: No token provided, allowing request");
                req.user = { sub: 'dev-user', email: 'dev@intelgraph.local', role: 'admin' };
            }
            next();
        };
    app.use("/graphql", express_1.default.json(), authenticateToken, // WAR-GAMED SIMULATION - Add authentication middleware here
    (0, express4_1.expressMiddleware)(apollo, { context: auth_js_1.getContext }));
    return app;
};
exports.createApp = createApp;
//# sourceMappingURL=app.js.map