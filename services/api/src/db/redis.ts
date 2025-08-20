/**
 * IntelGraph Redis Connection for Caching and Pub/Sub
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

class RedisConnection {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectionName: 'intelgraph-api',
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'intelgraph:',
    };

    try {
      // Main Redis client for caching and general operations
      this.client = new Redis(config);
      
      // Separate clients for pub/sub to avoid blocking
      this.subscriber = new Redis({
        ...config,
        connectionName: 'intelgraph-subscriber'
      });
      
      this.publisher = new Redis({
        ...config,
        connectionName: 'intelgraph-publisher'
      });

      // Connect all clients
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      // Set up error handlers
      this.setupErrorHandlers();

      this.isConnected = true;
      logger.info({
        message: 'Redis connection established',
        host: config.host,
        port: config.port,
        db: config.db
      });

    } catch (error) {
      logger.error({
        message: 'Failed to connect to Redis',
        error: error instanceof Error ? error.message : String(error),
        host: config.host,
        port: config.port
      });
      throw error;
    }
  }

  private setupErrorHandlers(): void {
    const clients = [
      { name: 'client', instance: this.client },
      { name: 'subscriber', instance: this.subscriber },
      { name: 'publisher', instance: this.publisher }
    ];

    clients.forEach(({ name, instance }) => {
      instance?.on('error', (error) => {
        logger.error({
          message: `Redis ${name} error`,
          error: error.message
        });
      });

      instance?.on('reconnecting', () => {
        logger.info(`Redis ${name} reconnecting...`);
      });

      instance?.on('connect', () => {
        logger.info(`Redis ${name} connected`);
      });
    });
  }

  // Caching methods
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error({
        message: 'Redis GET failed',
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return null; // Graceful degradation
    }
  }

  async set<T = any>(
    key: string, 
    value: T, 
    ttlSeconds?: number
  ): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      logger.error({
        message: 'Redis SET failed',
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async del(key: string | string[]): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      return await this.client.del(...(Array.isArray(key) ? key : [key]));
    } catch (error) {
      logger.error({
        message: 'Redis DEL failed',
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({
        message: 'Redis EXISTS failed',
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error({
        message: 'Redis EXPIRE failed',
        key,
        seconds,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // Hash operations for complex objects
  async hset(key: string, field: string, value: any): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      const result = await this.client.hset(key, field, JSON.stringify(value));
      return result === 1;
    } catch (error) {
      logger.error({
        message: 'Redis HSET failed',
        key,
        field,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async hget<T = any>(key: string, field: string): Promise<T | null> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error({
        message: 'Redis HGET failed',
        key,
        field,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  async hgetall<T = Record<string, any>>(key: string): Promise<T | null> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      const hash = await this.client.hgetall(key);
      if (Object.keys(hash).length === 0) {
        return null;
      }

      const parsed: Record<string, any> = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value; // Keep as string if not JSON
        }
      }
      
      return parsed as T;
    } catch (error) {
      logger.error({
        message: 'Redis HGETALL failed',
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  // Pub/Sub methods
  async publish(channel: string, message: any): Promise<number> {
    if (!this.publisher) {
      throw new Error('Redis publisher not initialized');
    }

    try {
      const serialized = JSON.stringify(message);
      return await this.publisher.publish(channel, serialized);
    } catch (error) {
      logger.error({
        message: 'Redis PUBLISH failed',
        channel,
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  async subscribe(
    channels: string | string[],
    callback: (channel: string, message: any) => void
  ): Promise<void> {
    if (!this.subscriber) {
      throw new Error('Redis subscriber not initialized');
    }

    try {
      await this.subscriber.subscribe(...(Array.isArray(channels) ? channels : [channels]));
      
      this.subscriber.on('message', (channel: string, message: string) => {
        try {
          const parsed = JSON.parse(message);
          callback(channel, parsed);
        } catch (error) {
          logger.error({
            message: 'Failed to parse Redis message',
            channel,
            message: message.substring(0, 100),
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });
    } catch (error) {
      logger.error({
        message: 'Redis SUBSCRIBE failed',
        channels,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async unsubscribe(channels?: string | string[]): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    try {
      if (channels) {
        await this.subscriber.unsubscribe(...(Array.isArray(channels) ? channels : [channels]));
      } else {
        await this.subscriber.unsubscribe();
      }
    } catch (error) {
      logger.error({
        message: 'Redis UNSUBSCRIBE failed',
        channels,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Cache with automatic expiration
  async cacheWithTTL<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300 // 5 minutes default
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  // Distributed locking
  async acquireLock(
    key: string,
    ttlSeconds: number = 30,
    waitTimeSeconds: number = 10
  ): Promise<string | null> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    const lockId = Math.random().toString(36);
    const lockKey = `lock:${key}`;
    const endTime = Date.now() + (waitTimeSeconds * 1000);

    while (Date.now() < endTime) {
      try {
        const result = await this.client.set(lockKey, lockId, 'PX', ttlSeconds * 1000, 'NX');
        if (result === 'OK') {
          return lockId;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error({
          message: 'Failed to acquire Redis lock',
          key,
          error: error instanceof Error ? error.message : String(error)
        });
        break;
      }
    }

    return null;
  }

  async releaseLock(key: string, lockId: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.client.eval(script, 1, `lock:${key}`, lockId);
      return result === 1;
    } catch (error) {
      logger.error({
        message: 'Failed to release Redis lock',
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  // Analytics and metrics cache helpers
  async cacheAnalyticsResult(
    algorithm: string,
    parameters: Record<string, any>,
    result: any,
    tenantId: string,
    ttlHours: number = 1
  ): Promise<void> {
    const cacheKey = `analytics:${tenantId}:${algorithm}:${this.hashObject(parameters)}`;
    await this.set(cacheKey, result, ttlHours * 3600);
  }

  async getCachedAnalyticsResult<T = any>(
    algorithm: string,
    parameters: Record<string, any>,
    tenantId: string
  ): Promise<T | null> {
    const cacheKey = `analytics:${tenantId}:${algorithm}:${this.hashObject(parameters)}`;
    return this.get<T>(cacheKey);
  }

  private hashObject(obj: Record<string, any>): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.client) {
        return { status: 'disconnected' };
      }

      const ping = await this.client.ping();
      const info = await this.client.info('server');
      
      return {
        status: ping === 'PONG' ? 'healthy' : 'unhealthy',
        details: {
          connected: this.isConnected,
          ping,
          serverInfo: info.split('\r\n').slice(0, 5).join(' | ')
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  async close(): Promise<void> {
    const clients = [
      { name: 'client', instance: this.client },
      { name: 'subscriber', instance: this.subscriber },
      { name: 'publisher', instance: this.publisher }
    ];

    await Promise.all(
      clients.map(async ({ name, instance }) => {
        if (instance) {
          try {
            await instance.quit();
            logger.info(`Redis ${name} connection closed`);
          } catch (error) {
            logger.error({
              message: `Failed to close Redis ${name} connection`,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      })
    );

    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }
}

// Export singleton instance
export const redisConnection = new RedisConnection();
export const redisClient = redisConnection;

// Initialize connection on module load
redisConnection.connect().catch(error => {
  logger.error({
    message: 'Failed to initialize Redis connection',
    error: error instanceof Error ? error.message : String(error)
  });
});