"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.similarityResolvers = void 0;
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../../config/logger"));
const graphql_1 = require("graphql");
const crypto_1 = require("crypto");
const database_js_1 = require("../../config/database.js");
const withAuthAndPolicy_js_1 = require("../../middleware/withAuthAndPolicy.js");
const prom_client_1 = __importDefault(require("prom-client"));
const metrics_js_1 = require("../../monitoring/metrics.js");
const EmbeddingService_js_1 = __importDefault(require("../../services/EmbeddingService.js"));
const log = logger_1.default.child({ name: 'similarity' });
let pool = null;
const CACHE_TTL_MS = 60000;
const cache = new Map();
const similarityMs = new prom_client_1.default.Histogram({
    name: 'similarity_ms',
    help: 'similarity resolver latency in ms',
    buckets: [5, 10, 25, 50, 100, 200, 400, 800],
});
const similarityCacheHitRatio = new prom_client_1.default.Gauge({
    name: 'similarity_cache_hit_ratio',
    help: 'ratio of cache hits for similarity resolver',
});
metrics_js_1.register.registerMetric(similarityMs);
metrics_js_1.register.registerMetric(similarityCacheHitRatio);
let cacheHits = 0;
let cacheMisses = 0;
function updateCacheMetrics(hit) {
    if (hit) {
        cacheHits++;
    }
    else {
        cacheMisses++;
    }
    const total = cacheHits + cacheMisses;
    similarityCacheHitRatio.set(total ? cacheHits / total : 0);
}
function getPool() {
    if (!pool) {
        pool = (0, database_js_1.getPostgresPool)();
    }
    return pool;
}
const Args = zod_1.z.object({
    entityId: zod_1.z.string().optional(),
    text: zod_1.z.string().optional(),
    topK: zod_1.z.number().int().min(1).max(100).default(20),
    tenantId: zod_1.z.string()
}).refine((a) => a.entityId || a.text, { message: 'entityId or text required' });
const embeddingService = new EmbeddingService_js_1.default();
async function embeddingForText(text) {
    try {
        return await embeddingService.generateEmbedding({ text });
    }
    catch (err) {
        log.error({ err }, 'embedding generation failed');
        return new Array(1536).fill(0);
    }
}
exports.similarityResolvers = {
    Query: {
        similarEntities: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read:entities', (args, ctx) => ({ type: 'tenant', id: ctx.user.tenant }))(async (_, args, ctx) => {
            const start = Date.now();
            const { entityId, text, topK } = Args.parse({ ...args, tenantId: ctx.user.tenant });
            let embedding;
            if (entityId) {
                const r = await getPool().query('SELECT embedding FROM entity_embeddings WHERE entity_id=$1 AND tenant_id=$2', [entityId, ctx.user.tenant]);
                if (!r.rowCount || !r.rows[0].embedding) {
                    throw new graphql_1.GraphQLError('Embedding missing for entity', {
                        extensions: { code: 'UNPROCESSABLE_ENTITY' },
                    });
                }
                embedding = r.rows[0].embedding;
            }
            else {
                embedding = await embeddingForText(text);
            }
            const hash = (0, crypto_1.createHash)('sha256').update(embedding.join(',')).digest('base64');
            const key = `${hash}:${topK}`;
            const hit = cache.get(key);
            if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
                updateCacheMetrics(true);
                similarityMs.observe(Date.now() - start);
                return hit.data;
            }
            const rows = await getPool().query(`SELECT e.entity_id, 1 - (e.embedding <=> $1::vector) AS score
           FROM entity_embeddings e
           WHERE e.tenant_id = $2
           ORDER BY e.embedding <=> $1::vector ASC
           LIMIT $3`, [`[${embedding.join(',')}]`, ctx.user.tenant, topK]);
            const data = rows.rows.map((r) => ({ id: r.entity_id, score: Number(r.score) }));
            cache.set(key, { data, ts: Date.now() });
            updateCacheMetrics(false);
            log.info({ count: rows.rowCount }, 'similarEntities');
            similarityMs.observe(Date.now() - start);
            return data;
        })
    }
};
//# sourceMappingURL=similarity.js.map