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
exports.connectNeo4j = connectNeo4j;
exports.connectPostgres = connectPostgres;
exports.connectRedis = connectRedis;
exports.getNeo4jDriver = getNeo4jDriver;
exports.getPostgresPool = getPostgresPool;
exports.getRedisClient = getRedisClient;
exports.closeConnections = closeConnections;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const index_js_1 = __importDefault(require("./index.js"));
;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
let neo4jDriver = null;
let postgresPool = null;
let redisClient = null;
// Neo4j Connection
async function connectNeo4j() {
    try {
        neo4jDriver = neo4j_driver_1.default.driver(index_js_1.default.neo4j.uri, neo4j_driver_1.default.auth.basic(index_js_1.default.neo4j.username, index_js_1.default.neo4j.password));
        // Test connection
        const session = neo4jDriver.session();
        await session.run("RETURN 1");
        await session.close();
        // Run migrations to set up constraints and indexes
        await runNeo4jMigrations();
        logger_js_1.default.info("✅ Connected to Neo4j");
        return neo4jDriver;
    }
    catch (error) {
        logger_js_1.default.error("❌ Failed to connect to Neo4j:", error);
        throw error;
    }
}
async function runNeo4jMigrations() {
    try {
        // Import migration manager lazily to avoid circular dependencies
        const { migrationManager } = await Promise.resolve().then(() => __importStar(require("../db/migrations/index.js")));
        await migrationManager.migrate();
        logger_js_1.default.info("Neo4j migrations completed successfully");
    }
    catch (error) {
        logger_js_1.default.warn("Migration system not available, falling back to legacy constraints");
        await createNeo4jConstraints();
    }
}
async function createNeo4jConstraints() {
    if (!neo4jDriver)
        throw new Error("Neo4j driver not initialized");
    const session = neo4jDriver.session();
    try {
        const constraints = [
            "CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE",
            "CREATE CONSTRAINT entity_uuid IF NOT EXISTS FOR (e:Entity) REQUIRE e.uuid IS UNIQUE",
            "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
            "CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE",
            "CREATE CONSTRAINT investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE",
            "CREATE CONSTRAINT relationship_id IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE",
        ];
        for (const constraint of constraints) {
            try {
                await session.run(constraint);
            }
            catch (error) {
                if (!error.message.includes("already exists")) {
                    logger_js_1.default.warn("Failed to create constraint:", constraint, error.message);
                }
            }
        }
        const indexes = [
            "CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)",
            "CREATE INDEX entity_label IF NOT EXISTS FOR (e:Entity) ON (e.label)",
            "CREATE INDEX entity_created IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)",
            "CREATE INDEX investigation_status IF NOT EXISTS FOR (i:Investigation) ON (i.status)",
            "CREATE INDEX user_username IF NOT EXISTS FOR (u:User) ON (u.username)",
            "CREATE FULLTEXT INDEX entity_search IF NOT EXISTS FOR (e:Entity) ON EACH [e.label, e.description]",
            "CREATE FULLTEXT INDEX investigation_search IF NOT EXISTS FOR (i:Investigation) ON EACH [i.title, i.description]",
        ];
        for (const index of indexes) {
            try {
                await session.run(index);
            }
            catch (error) {
                if (!error.message.includes("already exists")) {
                    logger_js_1.default.warn("Failed to create index:", index, error.message);
                }
            }
        }
        logger_js_1.default.info("Neo4j constraints and indexes created");
    }
    catch (error) {
        logger_js_1.default.error("Failed to create Neo4j constraints:", error);
    }
    finally {
        await session.close();
    }
}
// PostgreSQL Connection
async function connectPostgres() {
    try {
        postgresPool = new pg_1.Pool({
            host: index_js_1.default.postgres.host,
            port: index_js_1.default.postgres.port,
            database: index_js_1.default.postgres.database,
            user: index_js_1.default.postgres.username,
            password: index_js_1.default.postgres.password,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        const client = await postgresPool.connect();
        await client.query("SELECT NOW()");
        client.release();
        await createPostgresTables();
        logger_js_1.default.info("✅ Connected to PostgreSQL");
        return postgresPool;
    }
    catch (error) {
        logger_js_1.default.error("❌ Failed to connect to PostgreSQL:", error);
        throw error;
    }
}
async function createPostgresTables() {
    if (!postgresPool)
        throw new Error("PostgreSQL pool not initialized");
    const client = await postgresPool.connect();
    try {
        // Users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'ANALYST',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Audit logs table
        await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Sessions table
        await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        refresh_token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Analysis results table
        await client.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_id VARCHAR(255) NOT NULL,
        analysis_type VARCHAR(100) NOT NULL,
        algorithm VARCHAR(100) NOT NULL,
        results JSONB NOT NULL,
        confidence_score DECIMAL(3,2),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await client.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_analysis_investigation ON analysis_results(investigation_id)");
        logger_js_1.default.info("PostgreSQL tables created");
    }
    catch (error) {
        logger_js_1.default.error("Failed to create PostgreSQL tables:", error);
    }
    finally {
        client.release();
    }
}
// Redis Connection
async function connectRedis() {
    try {
        const redisConfig = {
            host: index_js_1.default.redis.host,
            port: index_js_1.default.redis.port,
            db: index_js_1.default.redis.db,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            connectTimeout: 10000,
            lazyConnect: true,
            keepAlive: 30000,
            family: 4,
            enableOfflineQueue: false,
            reconnectOnError: (err) => {
                const targetError = "READONLY";
                return err.message.includes(targetError);
            },
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        };
        // Add password if provided
        if (index_js_1.default.redis.password) {
            redisConfig.password = index_js_1.default.redis.password;
        }
        redisClient = new ioredis_1.default(redisConfig);
        redisClient.on("error", (error) => {
            logger_js_1.default.error("Redis error:", error.message);
        });
        redisClient.on("connect", () => {
            logger_js_1.default.info("Redis connected");
        });
        redisClient.on("ready", () => {
            logger_js_1.default.info("✅ Redis ready");
        });
        redisClient.on("reconnecting", () => {
            logger_js_1.default.info("Redis reconnecting...");
        });
        redisClient.on("end", () => {
            logger_js_1.default.warn("Redis connection ended");
        });
        await redisClient.connect();
        await redisClient.ping();
        logger_js_1.default.info("✅ Connected to Redis");
        return redisClient;
    }
    catch (error) {
        logger_js_1.default.error("❌ Failed to connect to Redis:", error.message);
        // Don't throw error to allow server to start without Redis if needed
        logger_js_1.default.warn("Server will continue without Redis caching");
        return null;
    }
}
function getNeo4jDriver() {
    if (!neo4jDriver)
        throw new Error("Neo4j driver not initialized");
    return neo4jDriver;
}
function getPostgresPool() {
    if (!postgresPool)
        throw new Error("PostgreSQL pool not initialized");
    return postgresPool;
}
function getRedisClient() {
    if (!redisClient) {
        logger_js_1.default.warn("Redis client not available");
        return null;
    }
    return redisClient;
}
async function closeConnections() {
    if (neo4jDriver) {
        await neo4jDriver.close();
        logger_js_1.default.info("Neo4j connection closed");
    }
    if (postgresPool) {
        await postgresPool.end();
        logger_js_1.default.info("PostgreSQL connection closed");
    }
    if (redisClient) {
        redisClient.disconnect();
        logger_js_1.default.info("Redis connection closed");
    }
}
//# sourceMappingURL=database.js.map