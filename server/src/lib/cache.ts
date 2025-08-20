import Redis from 'ioredis';
import logger from '../config/logger';

const logger = logger.child({ name: 'cache' });
const redisClient = new Redis(); // Assuming Redis is running and accessible

redisClient.on('connect', () => logger.info('Redis client connected for caching.'));
redisClient.on('error', (err) => logger.error({ err }, 'Redis caching client error.'));

// Simple metrics for cache
const metrics = {
  cacheHit: { inc: () => {} }, // Placeholder
  cacheMiss: { inc: () => {} }, // Placeholder
  cacheEviction: { inc: () => {} }, // Placeholder
};

export const cached = (key: string, ttl: number, fn: () => Promise<any>) => async () => {
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