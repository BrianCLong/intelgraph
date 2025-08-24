"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphRagRateLimiter = exports.createRateLimitMiddleware = void 0;
const express_rate_limit_1 = require("express-rate-limit");
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const ioredis_1 = __importDefault(require("ioredis"));
const logger = logger.child({ name: 'rateLimit' });
// Initialize Redis client for rate limiting
const redisClient = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
});
redisClient.on('connect', () => logger.info('Rate Limit Redis connected'));
redisClient.on('error', (err) => logger.error({ err }, 'Rate Limit Redis Client Error'));
// Default options for rate limiting
const defaultRateLimitOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    statusCode: 429,
    headers: true,
};
// Function to create a rate limit middleware
const createRateLimitMiddleware = (options) => {
    return (0, express_rate_limit_1.rateLimit)({
        store: new rate_limit_redis_1.default({
            // @ts-expect-error - Known issue with RedisStore types
            sendCommand: (...args) => redisClient.call(...args),
        }),
        ...defaultRateLimitOptions,
        ...options,
        // Custom key generator to support per-user/per-tenant limits
        keyGenerator: (req) => {
            // Prioritize user ID from authenticated context
            if (req.user && req.user.id) {
                return `user:${req.user.id}`;
            }
            // Fallback to tenant ID if available (assuming it's on req.tenant)
            if (req.tenant && req.tenant.id) {
                return `tenant:${req.tenant.id}`;
            }
            // Fallback to IP address
            return req.ip;
        },
        handler: (req, res, next, options) => {
            logger.warn(`Rate limit exceeded for ${options.keyGenerator(req)} on ${req.path}`);
            res.status(options.statusCode).send(options.message);
        },
    });
};
exports.createRateLimitMiddleware = createRateLimitMiddleware;
// Specific rate limiters
exports.graphRagRateLimiter = (0, exports.createRateLimitMiddleware)({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute for GraphRAG
    message: 'Too many GraphRAG requests, please try again after a minute',
});
// You can add more specific rate limiters here
// export const authRateLimiter = createRateLimitMiddleware({ /* ... */ });
//# sourceMappingURL=rateLimit.js.map