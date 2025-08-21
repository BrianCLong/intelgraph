import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import logger from '../config/logger';

const logger = logger.child({ name: 'rateLimit' });

// Initialize Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('connect', () => logger.info('Rate Limit Redis connected'));
redisClient.on('error', (err) => logger.error({ err }, 'Rate Limit Redis Client Error'));

interface RateLimitOptions {
  windowMs: number; // Window size in milliseconds
  max: number; // Max requests per window
  message?: string; // Custom message
  keyGenerator?: (req: any) => string; // Function to generate key
  statusCode?: number; // Status code for exceeded limits
  headers?: boolean; // Include X-RateLimit-* headers
}

// Default options for rate limiting
const defaultRateLimitOptions: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  statusCode: 429,
  headers: true,
};

// Function to create a rate limit middleware
export const createRateLimitMiddleware = (options?: Partial<RateLimitOptions>) => {
  return rateLimit({
    store: new RedisStore({
      // @ts-expect-error - Known issue with RedisStore types
      sendCommand: (...args: string[]) => redisClient.call(...args),
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

// Specific rate limiters
export const graphRagRateLimiter = createRateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for GraphRAG
  message: 'Too many GraphRAG requests, please try again after a minute',
});

// You can add more specific rate limiters here
// export const authRateLimiter = createRateLimitMiddleware({ /* ... */ });
