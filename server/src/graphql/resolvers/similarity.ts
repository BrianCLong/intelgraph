import { z } from 'zod';
import logger from '../../config/logger';
import { GraphQLError } from 'graphql';
import { createHash } from 'crypto';
import { getPostgresPool } from '../../config/database.js';
import { withAuthAndPolicy } from '../../middleware/withAuthAndPolicy.js';
import client from 'prom-client';
import { register } from '../../monitoring/metrics.js';
import EmbeddingService from '../../services/EmbeddingService.js';

const log = logger.child({ name: 'similarity' });
let pool: any = null;

interface CacheEntry {
  ts: number;
  data: { id: string; score: number }[];
}
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

const similarityMs = new client.Histogram({
  name: 'similarity_ms',
  help: 'similarity resolver latency in ms',
  buckets: [5, 10, 25, 50, 100, 200, 400, 800],
});
const similarityCacheHitRatio = new client.Gauge({
  name: 'similarity_cache_hit_ratio',
  help: 'ratio of cache hits for similarity resolver',
});
register.registerMetric(similarityMs);
register.registerMetric(similarityCacheHitRatio);
let cacheHits = 0;
let cacheMisses = 0;

function updateCacheMetrics(hit: boolean) {
  if (hit) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
  const total = cacheHits + cacheMisses;
  similarityCacheHitRatio.set(total ? cacheHits / total : 0);
}

function getPool() {
  if (!pool) {
    pool = getPostgresPool();
  }
  return pool;
}
const Args = z.object({
  entityId: z.string().optional(),
  text: z.string().optional(),
  topK: z.number().int().min(1).max(100).default(20),
  tenantId: z.string()
}).refine((a) => a.entityId || a.text, { message: 'entityId or text required' });

const embeddingService = new EmbeddingService();

async function embeddingForText(text: string): Promise<number[]> {
  try {
    return await embeddingService.generateEmbedding({ text });
  } catch (err) {
    log.error({ err }, 'embedding generation failed');
    return new Array(1536).fill(0);
  }
}

export const similarityResolvers = {
  Query: {
    similarEntities: withAuthAndPolicy('read:entities', (args:any, ctx:any)=>({ type:'tenant', id: ctx.user.tenant }))(
      async (_: any, args: any, ctx: any) => {
        const start = Date.now();
        const { entityId, text, topK } = Args.parse({ ...args, tenantId: ctx.user.tenant });

        let embedding: number[];
        if (entityId) {
          const r = await getPool().query(
            'SELECT embedding FROM entity_embeddings WHERE entity_id=$1 AND tenant_id=$2',
            [entityId, ctx.user.tenant]
          );
          if (!r.rowCount || !r.rows[0].embedding) {
            throw new GraphQLError('Embedding missing for entity', {
              extensions: { code: 'UNPROCESSABLE_ENTITY' },
            });
          }
          embedding = r.rows[0].embedding;
        } else {
          embedding = await embeddingForText(text!);
        }

        const hash = createHash('sha256').update(embedding.join(',')).digest('base64');
        const key = `${hash}:${topK}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
          updateCacheMetrics(true);
          similarityMs.observe(Date.now() - start);
          return hit.data;
        }

        const rows = await getPool().query(
          `SELECT e.entity_id, 1 - (e.embedding <=> $1::vector) AS score
           FROM entity_embeddings e
           WHERE e.tenant_id = $2
           ORDER BY e.embedding <=> $1::vector ASC
           LIMIT $3`,
          [`[${embedding.join(',')}]`, ctx.user.tenant, topK]
        );

        const data = rows.rows.map((r: any) => ({ id: r.entity_id, score: Number(r.score) }));
        cache.set(key, { data, ts: Date.now() });
        updateCacheMetrics(false);

        log.info({ count: rows.rowCount }, 'similarEntities');
        similarityMs.observe(Date.now() - start);
        return data;
      }
    )
  }
};