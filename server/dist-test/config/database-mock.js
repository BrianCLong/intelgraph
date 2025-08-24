// Mock database configuration for testing when databases are not available
const EventEmitter = require('events');
let mockConnected = false;
// Mock Neo4j Driver
class MockNeo4jSession {
    async run(query, params = {}) {
        // Return mock data based on query
        if (query.includes('RETURN 1')) {
            return { records: [{ get: () => 1 }] };
        }
        if (query.includes('CREATE CONSTRAINT')) {
            return { summary: { counters: {} } };
        }
        if (query.includes('CREATE INDEX')) {
            return { summary: { counters: {} } };
        }
        return { records: [] };
    }
    async close() {
        // Mock close
    }
}
class MockNeo4jDriver {
    session() {
        return new MockNeo4jSession();
    }
    async close() {
        // Mock close
    }
}
// Mock PostgreSQL Pool
class MockPostgresClient {
    async query(sql, params = []) {
        // Return mock data based on query
        if (sql.includes('SELECT NOW()')) {
            return { rows: [{ now: new Date() }] };
        }
        if (sql.includes('CREATE TABLE')) {
            return { rows: [] };
        }
        if (sql.includes('CREATE INDEX')) {
            return { rows: [] };
        }
        return { rows: [] };
    }
    release() {
        // Mock release
    }
}
class MockPostgresPool extends EventEmitter {
    async connect() {
        return new MockPostgresClient();
    }
    async query(sql, params = []) {
        const client = await this.connect();
        const result = await client.query(sql, params);
        client.release();
        return result;
    }
    async end() {
        // Mock end
    }
}
// Mock Redis Client
class MockRedisClient extends EventEmitter {
    async ping() {
        return 'PONG';
    }
    async setex(key, ttl, value) {
        return 'OK';
    }
    async get(key) {
        return null;
    }
    async del(key) {
        return 1;
    }
    async publish(channel, message) {
        return 1;
    }
    disconnect() {
        // Mock disconnect
    }
}
// Initialize mock instances
let mockNeo4jDriver;
let mockPostgresPool;
let mockRedisClient;
async function connectNeo4j() {
    mockNeo4jDriver = new MockNeo4jDriver();
    console.log('✅ Connected to Mock Neo4j');
    mockConnected = true;
    return mockNeo4jDriver;
}
async function connectPostgres() {
    mockPostgresPool = new MockPostgresPool();
    // Mock table creation
    const client = await mockPostgresPool.connect();
    await client.query('CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY)');
    client.release();
    console.log('✅ Connected to Mock PostgreSQL');
    return mockPostgresPool;
}
async function connectRedis() {
    mockRedisClient = new MockRedisClient();
    console.log('✅ Connected to Mock Redis');
    return mockRedisClient;
}
function getNeo4jDriver() {
    if (!mockNeo4jDriver)
        throw new Error('Mock Neo4j driver not initialized');
    return mockNeo4jDriver;
}
function getPostgresPool() {
    if (!mockPostgresPool)
        throw new Error('Mock PostgreSQL pool not initialized');
    return mockPostgresPool;
}
function getRedisClient() {
    if (!mockRedisClient)
        throw new Error('Mock Redis client not initialized');
    return mockRedisClient;
}
async function closeConnections() {
    if (mockNeo4jDriver) {
        await mockNeo4jDriver.close();
        console.log('Mock Neo4j connection closed');
    }
    if (mockPostgresPool) {
        await mockPostgresPool.end();
        console.log('Mock PostgreSQL connection closed');
    }
    if (mockRedisClient) {
        mockRedisClient.disconnect();
        console.log('Mock Redis connection closed');
    }
}
module.exports = {
    connectNeo4j,
    connectPostgres,
    connectRedis,
    getNeo4jDriver,
    getPostgresPool,
    getRedisClient,
    closeConnections,
    isMockMode: true
};
//# sourceMappingURL=database-mock.js.map