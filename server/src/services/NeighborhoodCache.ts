/**
 * Neighborhood Cache Service
 * 
 * Redis-backed cache for graph neighborhoods to improve performance
 * of frequent graph traversal queries.
 */

import Redis from 'ioredis';
import pino from 'pino';
import { getTenantCacheKey } from '../middleware/withTenant.js';

const logger = pino({ name: 'NeighborhoodCache' });

interface NeighborhoodData {
  entityId: string;
  neighbors: Array<{
    id: string;
    type: string;
    relationshipType: string;
    props: Record<string, any>;
  }>;
  cachedAt: number;
  hops: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalKeys: number;
}

export class NeighborhoodCache {
  private redis: Redis;
  private defaultTTL: number = 300; // 5 minutes
  private maxHops: number = 3;
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, totalKeys: 0 };

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      keyPrefix: 'neighborhoods:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.redis.on('error', (err) => {
      logger.error({ error: err }, 'Redis connection error');
    });
  }

  /**
   * Get neighborhood data for an entity
   */
  async getNeighborhood(
    tenantId: string,
    entityId: string,
    hops: number = 1
  ): Promise<NeighborhoodData | null> {
    try {
      const key = this.generateKey(tenantId, entityId, hops);
      const cached = await this.redis.get(key);
      
      if (cached) {
        this.stats.hits++;
        const data = JSON.parse(cached) as NeighborhoodData;
        
        logger.debug('Neighborhood cache hit', {
          entityId,
          tenantId,
          hops,
          age: Date.now() - data.cachedAt
        });
        
        return data;
      }
      
      this.stats.misses++;
      logger.debug('Neighborhood cache miss', { entityId, tenantId, hops });
      return null;
    } catch (error) {
      logger.error({ error, entityId, tenantId }, 'Error reading from neighborhood cache');
      return null;
    }
  }

  /**
   * Store neighborhood data in cache
   */
  async setNeighborhood(
    tenantId: string,
    entityId: string,
    hops: number,
    neighbors: NeighborhoodData['neighbors'],
    ttl?: number
  ): Promise<void> {
    try {
      const key = this.generateKey(tenantId, entityId, hops);
      const data: NeighborhoodData = {
        entityId,
        neighbors,
        cachedAt: Date.now(),
        hops
      };

      await this.redis.setex(key, ttl || this.defaultTTL, JSON.stringify(data));
      this.stats.totalKeys++;
      
      logger.debug('Neighborhood cached', {
        entityId,
        tenantId,
        hops,
        neighborCount: neighbors.length,
        ttl: ttl || this.defaultTTL
      });
    } catch (error) {
      logger.error({ error, entityId, tenantId }, 'Error writing to neighborhood cache');
    }
  }

  /**
   * Invalidate neighborhood cache for an entity and its neighbors
   */
  async invalidateEntity(tenantId: string, entityId: string): Promise<void> {
    try {
      const pattern = getTenantCacheKey(tenantId, `*:${entityId}:*`);
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.evictions += keys.length;
        
        logger.debug('Invalidated neighborhood cache', {
          entityId,
          tenantId,
          keysRemoved: keys.length
        });
      }
    } catch (error) {
      logger.error({ error, entityId, tenantId }, 'Error invalidating neighborhood cache');
    }
  }

  /**
   * Invalidate cache for all neighbors of an entity
   */
  async invalidateNeighbors(tenantId: string, entityIds: string[]): Promise<void> {
    try {
      const patterns = entityIds.map(id => getTenantCacheKey(tenantId, `*:${id}:*`));
      const allKeys: string[] = [];
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        allKeys.push(...keys);
      }
      
      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
        this.stats.evictions += allKeys.length;
        
        logger.debug('Invalidated neighbor caches', {
          tenantId,
          entityCount: entityIds.length,
          keysRemoved: allKeys.length
        });
      }
    } catch (error) {
      logger.error({ error, tenantId }, 'Error invalidating neighbor caches');
    }
  }

  /**
   * Clear all neighborhood cache for a tenant
   */
  async clearTenantCache(tenantId: string): Promise<void> {
    try {
      const pattern = getTenantCacheKey(tenantId, '*');
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.evictions += keys.length;
        
        logger.info('Cleared tenant neighborhood cache', {
          tenantId,
          keysRemoved: keys.length
        });
      }
    } catch (error) {
      logger.error({ error, tenantId }, 'Error clearing tenant cache');
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRatio: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRatio = total > 0 ? this.stats.hits / total : 0;
    
    return {
      ...this.stats,
      hitRatio
    };
  }

  /**
   * Warm cache for commonly accessed entities
   */
  async warmCache(
    tenantId: string,
    entityIds: string[],
    getNeighborsFn: (entityId: string, hops: number) => Promise<NeighborhoodData['neighbors']>
  ): Promise<void> {
    logger.info('Warming neighborhood cache', {
      tenantId,
      entityCount: entityIds.length
    });

    const promises = entityIds.map(async (entityId) => {
      for (let hops = 1; hops <= this.maxHops; hops++) {
        try {
          const neighbors = await getNeighborsFn(entityId, hops);
          await this.setNeighborhood(tenantId, entityId, hops, neighbors, this.defaultTTL * 2);
        } catch (error) {
          logger.error({ error, entityId, hops }, 'Error warming cache for entity');
        }
      }
    });

    await Promise.all(promises);
    logger.info('Cache warming completed', { tenantId });
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; stats: any }> {
    try {
      await this.redis.ping();
      const info = await this.redis.info('memory');
      const stats = this.getStats();
      
      return {
        status: 'healthy',
        stats: {
          ...stats,
          memory: info
        }
      };
    } catch (error) {
      logger.error({ error }, 'Neighborhood cache health check failed');
      return {
        status: 'unhealthy',
        stats: this.getStats()
      };
    }
  }

  private generateKey(tenantId: string, entityId: string, hops: number): string {
    return getTenantCacheKey(tenantId, `${entityId}:${hops}`);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export default NeighborhoodCache;