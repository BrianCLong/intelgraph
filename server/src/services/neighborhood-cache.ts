import Redis from 'ioredis';
import { neighborhoodCacheHitRatio, neighborhoodCacheLatencyMs } from '../monitoring/metrics.js';
import { getNeo4jDriver } from '../config/database.js';
import { expandNeighborhood } from './GraphOpsService.js';

export interface Graph {
  nodes: Array<{ id: string }>;
  edges: Array<any>;
}

export class NeighborhoodCache {
  private hits = 0;
  private total = 0;
  private ttl: number;
  private maxEntries: number;
  constructor(
    private redis: Redis,
    ttl = 300,
    maxEntries = 10000,
  ) {
    this.ttl = ttl;
    this.maxEntries = maxEntries;
    this.startBackgroundSync();
  }

  private startBackgroundSync(): void {
    import('node-cron')
      .then((cron) => {
        cron.schedule('0 * * * *', async () => {
          const driver = getNeo4jDriver();
          const session = driver.session();
          try {
            const ctxRes = await session.run(
              'MATCH (n:Entity) RETURN DISTINCT n.tenantId AS tenantId, n.investigationId AS investigationId',
            );
            for (const record of ctxRes.records) {
              const tenantId = record.get('tenantId');
              const investigationId = record.get('investigationId');
              if (!tenantId || !investigationId) continue;
              const topRes = await session.run(
                `MATCH (e:Entity {tenantId: $tenantId, investigationId: $investigationId})-[r]-(m:Entity {tenantId: $tenantId, investigationId: $investigationId})
                 RETURN e.id AS id, count(r) AS score
                 ORDER BY score DESC
                 LIMIT 10`,
                { tenantId, investigationId },
              );
              for (const rec of topRes.records) {
                const entityId = rec.get('id');
                const graph = await expandNeighborhood(entityId, 2, {
                  tenantId,
                  investigationId,
                });
                await this.set(tenantId, investigationId, entityId, 2, graph);
              }
            }
          } catch (err) {
            console.error('Neighborhood cache prewarm failed', err);
          } finally {
            await session.close();
          }
        });
      })
      .catch((err) => {
        console.error('node-cron not available, skipping neighborhood prewarm', err);
      });
  }

  private key(tenantId: string, investigationId: string, entityId: string, radius: number): string {
    return `nbhd:${tenantId}:${investigationId}:${entityId}:${radius}`;
  }

  private tagKey(tenantId: string, investigationId: string, entityId: string): string {
    return `nbhd:tag:${tenantId}:${investigationId}:${entityId}`;
  }

  async get(
    tenantId: string,
    investigationId: string,
    entityId: string,
    radius: number,
  ): Promise<Graph | null> {
    const key = this.key(tenantId, investigationId, entityId, radius);
    const start = Date.now();
    const cached = await this.redis.get(key);
    neighborhoodCacheLatencyMs.observe(Date.now() - start);
    this.total++;
    if (cached) {
      this.hits++;
      neighborhoodCacheHitRatio.set(this.hits / this.total);
      return JSON.parse(cached);
    }
    neighborhoodCacheHitRatio.set(this.hits / this.total);
    return null;
  }

  async set(
    tenantId: string,
    investigationId: string,
    entityId: string,
    radius: number,
    data: Graph,
  ): Promise<void> {
    const key = this.key(tenantId, investigationId, entityId, radius);
    await this.redis.set(key, JSON.stringify(data), 'EX', this.ttl);
    const ids = new Set<string>([entityId, ...data.nodes.map((n) => n.id)]);
    for (const id of ids) {
      await this.redis.sadd(this.tagKey(tenantId, investigationId, id), key);
    }
    await this.cleanupIfNeeded();
  }

  async invalidate(tenantId: string, investigationId: string, entityIds: string[]): Promise<void> {
    for (const id of entityIds) {
      const tKey = this.tagKey(tenantId, investigationId, id);
      const keys = await this.redis.smembers(tKey);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      await this.redis.del(tKey);
    }
  }

  private async cleanupIfNeeded(): Promise<void> {
    const keys = await this.redis.keys('nbhd:*');
    if (keys.length > this.maxEntries) {
      const toRemove = Math.floor(keys.length * 0.1);
      const keysToRemove = keys.slice(0, toRemove);
      if (keysToRemove.length > 0) {
        await this.redis.del(...keysToRemove);
      }
    }
  }
}

export default NeighborhoodCache;
