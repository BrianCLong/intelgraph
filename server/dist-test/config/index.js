"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const isProd = process.env.NODE_ENV === 'production';
const bad = [
    process.env.JWT_SECRET === 'dev_jwt_secret_12345',
    (process.env.POSTGRES_PASSWORD || '').startsWith('dev'),
    (process.env.REDIS_PASSWORD || '').startsWith('dev'),
].some(Boolean);
if (isProd && bad) {
    // eslint-disable-next-line no-console
    console.error('Refusing to start with default secrets in production.');
    process.exit(1);
}
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000'),
    // Production readiness flag - fail fast if DBs not available
    requireRealDbs: process.env.REQUIRE_REAL_DBS === 'true',
    // Database configurations
    neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'devpassword',
        database: process.env.NEO4J_DATABASE || 'neo4j'
    },
    postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'intelgraph_dev',
        username: process.env.POSTGRES_USER || 'intelgraph',
        password: process.env.POSTGRES_PASSWORD || 'devpassword'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'devpassword',
        db: parseInt(process.env.REDIS_DB || '0')
    },
    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'dev_jwt_secret_12345',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_67890',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    // Security
    bcrypt: {
        rounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
    },
    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000)),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
    },
    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },
    // Feature flags
    features: {
        GRAPH_EXPAND_CACHE: process.env.GRAPH_EXPAND_CACHE !== '0',
        AI_REQUEST_ENABLED: process.env.AI_REQUEST_ENABLED !== '0',
    }
};
// Validation for production readiness
if (config.requireRealDbs) {
    const requiredEnvVars = [
        'NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD',
        'POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD',
        'REDIS_HOST'
    ];
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`❌ REQUIRE_REAL_DBS=true but missing env vars: ${missing.join(', ')}`);
        process.exit(1);
    }
    // Ensure not using default dev passwords in production
    const devPasswords = ['devpassword', 'dev_jwt_secret_12345'];
    if (devPasswords.includes(config.neo4j.password) ||
        devPasswords.includes(config.postgres.password) ||
        devPasswords.includes(config.jwt.secret)) {
        console.error('❌ REQUIRE_REAL_DBS=true but using default dev passwords');
        process.exit(1);
    }
}
exports.default = config;
//# sourceMappingURL=index.js.map