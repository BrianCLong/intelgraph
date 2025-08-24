"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cached = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger = logger.child({ name: 'cache' });
const redisClient = new ioredis_1.default(); // Assuming Redis is running and accessible
redisClient.on('connect', () => logger.info('Redis client connected for caching.'));
redisClient.on('error', (err) => logger.error({ err }, 'Redis caching client error.'));
// Simple metrics for cache
const metrics = {
    cacheHit: { inc: () => { } }, // Placeholder
    cacheMiss: { inc: () => { } }, // Placeholder
    cacheEviction: { inc: () => { } }, // Placeholder
};
const cached = (key, ttl, fn) => async () => {
    const hit = await redisClient.get(key);
    if (hit) {
        metrics.cacheHit.inc();
        return JSON.parse(hit);
    }
    const val = await fn();
    await redisClient.setex(key, ttl, JSON.stringify(val));
    metrics.cacheMiss.inc();
    return val;
};
exports.cached = cached;
//# sourceMappingURL=cache.js.map