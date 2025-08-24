"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.closeRedisClient = closeRedisClient;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const logger = logger.child({ name: 'redis' });
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'devpassword';
let redisClient;
function getRedisClient() {
    if (!redisClient) {
        try {
            redisClient = new ioredis_1.default({
                host: REDIS_HOST,
                port: REDIS_PORT,
                password: REDIS_PASSWORD,
                connectTimeout: 5000,
                lazyConnect: true,
            });
            redisClient.on('connect', () => logger.info('Redis client connected.'));
            redisClient.on('error', (err) => {
                logger.warn(`Redis connection failed - using mock responses. Error: ${err.message}`);
                redisClient = createMockRedisClient();
            });
        }
        catch (error) {
            logger.warn(`Redis initialization failed - using development mode. Error: ${error.message}`);
            redisClient = createMockRedisClient();
        }
    }
    return redisClient;
}
function createMockRedisClient() {
    return {
        get: async (key) => {
            logger.debug(`Mock Redis GET: Key: ${key}`);
            return null;
        },
        set: async (key, value, ...args) => {
            logger.debug(`Mock Redis SET: Key: ${key}, Value: ${value}`);
            return 'OK';
        },
        del: async (...keys) => {
            logger.debug(`Mock Redis DEL: Keys: ${keys.join(', ')}`);
            return keys.length;
        },
        exists: async (...keys) => {
            logger.debug(`Mock Redis EXISTS: Keys: ${keys.join(', ')}`);
            return 0;
        },
        expire: async (key, seconds) => {
            logger.debug(`Mock Redis EXPIRE: Key: ${key}, Seconds: ${seconds}`);
            return 1;
        },
        quit: async () => { },
        on: () => { },
        connect: async () => { }
    };
}
async function closeRedisClient() {
    if (redisClient) {
        await redisClient.quit();
        logger.info('Redis client closed.');
        redisClient = null; // Clear the client instance
    }
}
//# sourceMappingURL=redis.js.map