"use strict";
/**
 * Similarity Service
 *
 * Provides fast similarity search using pgvector HNSW index
 * for entity recommendations and graph exploration.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.similarityService = exports.SimilarityService = void 0;
const database_js_1 = require("../config/database.js");
const EmbeddingService_js_1 = __importDefault(require("./EmbeddingService.js"));
const opentelemetry_js_1 = require("../monitoring/opentelemetry.js");
const zod_1 = require("zod");
const logger = logger.child({ name: 'SimilarityService' });
// Input validation schemas
const SimilarityQuerySchema = zod_1.z.object({
    investigationId: zod_1.z.string().min(1),
    entityId: zod_1.z.string().optional(),
    text: zod_1.z.string().optional(),
    topK: zod_1.z.number().int().min(1).max(100).default(10),
    threshold: zod_1.z.number().min(0).max(1).default(0.7),
    includeText: zod_1.z.boolean().default(false)
}).refine(data => data.entityId || data.text, {
    message: "Either entityId or text must be provided"
});
const BulkSimilarityQuerySchema = zod_1.z.object({
    investigationId: zod_1.z.string().min(1),
    entityIds: zod_1.z.array(zod_1.z.string()).min(1).max(50),
    topK: zod_1.z.number().int().min(1).max(100).default(5),
    threshold: zod_1.z.number().min(0).max(1).default(0.7)
});
class SimilarityService {
    constructor() {
        this.postgres = null; // Will be initialized lazily
        this.embeddingService = new EmbeddingService_js_1.default();
        this.config = {
            defaultTopK: 10,
            defaultThreshold: 0.7,
            maxBatchSize: 50,
            cacheExpiry: 3600 // 1 hour
        };
    }
    getPool() {
        if (!this.postgres) {
            this.postgres = (0, database_js_1.getPostgresPool)();
        }
        return this.postgres;
    }
    /**
     * Find similar entities by entity ID or text
     */
    async findSimilar(query) {
        const startTime = Date.now();
        return opentelemetry_js_1.otelService.wrapNeo4jOperation('similarity-search', async () => {
            try {
                const validated = SimilarityQuerySchema.parse(query);
                logger.debug('Similarity search requested', {
                    investigationId: validated.investigationId,
                    entityId: validated.entityId,
                    hasText: !!validated.text,
                    topK: validated.topK
                });
                let targetEmbedding;
                let queryType;
                let queryValue;
                if (validated.entityId) {
                    // Search by existing entity embedding
                    targetEmbedding = await this.getEntityEmbedding(validated.entityId);
                    queryType = 'entity';
                    queryValue = validated.entityId;
                }
                else {
                    // Search by text embedding
                    targetEmbedding = await this.embeddingService.generateEmbedding({
                        text: validated.text,
                        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
                    });
                    queryType = 'text';
                    queryValue = validated.text;
                }
                // Perform similarity search
                const results = await this.performVectorSearch(targetEmbedding, validated.investigationId, validated.topK, validated.threshold, validated.includeText, validated.entityId // Exclude the query entity itself
                );
                const executionTime = Date.now() - startTime;
                logger.info('Similarity search completed', {
                    investigationId: validated.investigationId,
                    queryType,
                    resultsCount: results.length,
                    executionTime,
                    topSimilarity: results[0]?.similarity || 0
                });
                opentelemetry_js_1.otelService.addSpanAttributes({
                    'similarity.investigation_id': validated.investigationId,
                    'similarity.query_type': queryType,
                    'similarity.results_count': results.length,
                    'similarity.execution_time': executionTime,
                    'similarity.top_k': validated.topK
                });
                return {
                    query: {
                        type: queryType,
                        value: queryValue
                    },
                    results,
                    totalResults: results.length,
                    executionTime
                };
            }
            catch (error) {
                logger.error('Similarity search failed', {
                    investigationId: query.investigationId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                throw error;
            }
        });
    }
    /**
     * Find similar entities for multiple entities at once
     */
    async findSimilarBulk(query) {
        return opentelemetry_js_1.otelService.wrapNeo4jOperation('bulk-similarity-search', async () => {
            try {
                const validated = BulkSimilarityQuerySchema.parse(query);
                logger.debug('Bulk similarity search requested', {
                    investigationId: validated.investigationId,
                    entityCount: validated.entityIds.length,
                    topK: validated.topK
                });
                const results = new Map();
                // Process entities in smaller batches to avoid overwhelming the database
                const batchSize = Math.min(validated.entityIds.length, 10);
                for (let i = 0; i < validated.entityIds.length; i += batchSize) {
                    const batch = validated.entityIds.slice(i, i + batchSize);
                    const batchPromises = batch.map(async (entityId) => {
                        try {
                            const similarResult = await this.findSimilar({
                                investigationId: validated.investigationId,
                                entityId,
                                topK: validated.topK,
                                threshold: validated.threshold
                            });
                            return [entityId, similarResult.results];
                        }
                        catch (error) {
                            logger.warn('Failed to find similar entities for entity', {
                                entityId,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            });
                            return [entityId, []];
                        }
                    });
                    const batchResults = await Promise.all(batchPromises);
                    for (const [entityId, similarEntities] of batchResults) {
                        results.set(entityId, similarEntities);
                    }
                }
                logger.info('Bulk similarity search completed', {
                    investigationId: validated.investigationId,
                    entityCount: validated.entityIds.length,
                    successfulResults: results.size
                });
                return results;
            }
            catch (error) {
                logger.error('Bulk similarity search failed', {
                    investigationId: query.investigationId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                throw error;
            }
        });
    }
    /**
     * Get entity embedding from database
     */
    async getEntityEmbedding(entityId) {
        const client = await this.getPool().connect();
        try {
            const result = await client.query('SELECT embedding FROM entity_embeddings WHERE entity_id = $1', [entityId]);
            if (result.rows.length === 0) {
                throw new Error(`No embedding found for entity ${entityId}`);
            }
            // pgvector returns the embedding as a string, parse it back to array
            const embeddingString = result.rows[0].embedding;
            return this.parseVectorString(embeddingString);
        }
        finally {
            client.release();
        }
    }
    /**
     * Perform vector similarity search using pgvector
     */
    async performVectorSearch(targetEmbedding, investigationId, topK, threshold, includeText, excludeEntityId) {
        const client = await this.getPool().connect();
        try {
            // Convert embedding to pgvector format
            const vectorString = `[${targetEmbedding.join(',')}]`;
            // Build query
            let query = `
        SELECT 
          ee.entity_id,
          1 - (ee.embedding <=> $1::vector) as similarity
          ${includeText ? ', ee.text' : ''}
        FROM entity_embeddings ee
        WHERE ee.investigation_id = $2
      `;
            const params = [vectorString, investigationId];
            let paramIndex = 3;
            // Exclude specific entity if provided
            if (excludeEntityId) {
                query += ` AND ee.entity_id != $${paramIndex}`;
                params.push(excludeEntityId);
                paramIndex++;
            }
            // Add similarity threshold
            query += ` AND (1 - (ee.embedding <=> $1::vector)) >= $${paramIndex}`;
            params.push(threshold);
            paramIndex++;
            // Order by similarity and limit
            query += `
        ORDER BY ee.embedding <=> $1::vector
        LIMIT $${paramIndex}
      `;
            params.push(topK);
            const result = await client.query(query, params);
            return result.rows.map(row => ({
                entityId: row.entity_id,
                similarity: parseFloat(row.similarity),
                text: includeText ? row.text : undefined
            }));
        }
        finally {
            client.release();
        }
    }
    /**
     * Parse pgvector string format back to number array
     */
    parseVectorString(vectorString) {
        // Remove brackets and split by comma
        const cleaned = vectorString.replace(/^\[|\]$/g, '');
        return cleaned.split(',').map(v => parseFloat(v.trim()));
    }
    /**
     * Get similarity statistics for an investigation
     */
    async getStats(investigationId) {
        const client = await this.getPool().connect();
        try {
            // Get embedding count and last update
            const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total_embeddings,
          MAX(updated_at) as last_updated
        FROM entity_embeddings 
        WHERE investigation_id = $1
      `, [investigationId]);
            // Check index health
            const indexResult = await client.query(`
        SELECT 
          schemaname, 
          tablename, 
          indexname, 
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'entity_embeddings' 
          AND indexname = 'entity_embeddings_hnsw_idx'
      `);
            const indexHealth = indexResult.rows.length > 0 ? 'healthy' : 'missing';
            return {
                totalEmbeddings: parseInt(statsResult.rows[0].total_embeddings),
                avgSimilarityThreshold: this.config.defaultThreshold,
                lastUpdated: statsResult.rows[0].last_updated,
                indexHealth
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Rebuild HNSW index (for maintenance)
     */
    async rebuildIndex() {
        const client = await this.getPool().connect();
        try {
            logger.info('Rebuilding HNSW index...');
            // Drop existing index
            await client.query('DROP INDEX IF EXISTS entity_embeddings_hnsw_idx');
            // Recreate index
            await client.query(`
        CREATE INDEX entity_embeddings_hnsw_idx 
        ON entity_embeddings 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
      `);
            logger.info('HNSW index rebuilt successfully');
        }
        finally {
            client.release();
        }
    }
}
exports.SimilarityService = SimilarityService;
exports.similarityService = new SimilarityService();
//# sourceMappingURL=SimilarityService.js.map