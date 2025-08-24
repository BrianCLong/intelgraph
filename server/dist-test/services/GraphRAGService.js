"use strict";
/**
 * GraphRAG Service - Retrieval Augmented Generation over Knowledge Graphs
 * Combines graph traversal with LLM generation for intelligent responses
 *
 * v1.5 Features:
 * - TypeScript with strict types
 * - JSON schema enforced output
 * - Redis caching with subgraph-hash keys
 * - Explainable why_paths and citations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRAGService = void 0;
const zod_1 = require("zod");
const crypto_1 = require("crypto");
const CircuitBreaker_js_1 = require("../utils/CircuitBreaker.js"); // Import CircuitBreaker
const PathRankingService_js_1 = require("./PathRankingService.js");
const metrics_js_1 = require("../monitoring/metrics.js");
const errors_js_1 = require("../lib/errors.js");
const graphrag_js_1 = __importDefault(require("../config/graphrag.js"));
const logger = logger.child({ name: "GraphRAGService" });
// Zod schemas for type safety and validation
const GraphRAGRequestSchema = zod_1.z.object({
    investigationId: zod_1.z.string().min(1),
    question: zod_1.z.string().min(3),
    focusEntityIds: zod_1.z.array(zod_1.z.string()).optional(),
    maxHops: zod_1.z.number().int().min(1).max(3).optional(),
    temperature: zod_1.z.number().min(0).max(1).optional(),
    maxTokens: zod_1.z.number().int().min(100).max(2000).optional(),
    useCase: zod_1.z.string().optional().default("default"),
    rankingStrategy: zod_1.z.enum(["v1", "v2"]).optional(),
});
const EntitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    label: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    properties: zod_1.z.record(zod_1.z.any()),
    confidence: zod_1.z.number().min(0).max(1),
});
const RelationshipSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    fromEntityId: zod_1.z.string(),
    toEntityId: zod_1.z.string(),
    label: zod_1.z.string().optional(),
    properties: zod_1.z.record(zod_1.z.any()),
    confidence: zod_1.z.number().min(0).max(1),
});
const ScoreBreakdownSchema = zod_1.z.object({
    length: zod_1.z.number(),
    edgeType: zod_1.z.number(),
    centrality: zod_1.z.number(),
});
const WhyPathSchema = zod_1.z.object({
    from: zod_1.z.string(),
    to: zod_1.z.string(),
    relId: zod_1.z.string(),
    type: zod_1.z.string(),
    supportScore: zod_1.z.number().min(0).max(1).optional(),
    score_breakdown: ScoreBreakdownSchema.optional(),
});
const CitationsSchema = zod_1.z.object({
    entityIds: zod_1.z.array(zod_1.z.string()),
});
// Strict JSON schema for LLM output validation
const GraphRAGResponseSchema = zod_1.z.object({
    answer: zod_1.z.string().min(1),
    confidence: zod_1.z.number().min(0).max(1),
    citations: CitationsSchema,
    why_paths: zod_1.z.array(WhyPathSchema),
});
class GraphRAGService {
    constructor(neo4jDriver, llmService, embeddingService, redisClient) {
        this.cacheStats = { hits: 0, total: 0 };
        this.neo4j = neo4jDriver;
        this.redis = redisClient || null;
        this.llmService = llmService;
        this.embeddingService = embeddingService;
        this.circuitBreaker = new CircuitBreaker_js_1.CircuitBreaker({
            failureThreshold: 5,
            successThreshold: 3,
            resetTimeout: 30000, // 30 seconds
            p95ThresholdMs: 2000, // 2 seconds
            errorRateThreshold: 0.5, // 50%
        });
        this.config = {
            maxContextSize: 4000,
            maxRetrievalDepth: 3,
            minRelevanceScore: 0.7,
            cacheTTL: 300,
            maxCacheTTL: 3600,
            cacheFreqWindow: 600,
            llmModel: "gpt-4",
            embeddingModel: "text-embedding-3-small",
        };
    }
    /**
     * Main GraphRAG query method with explainable output
     */
    async answer(request) {
        return this.circuitBreaker.execute(async () => {
            const validated = GraphRAGRequestSchema.parse(request);
            const useCase = validated.useCase;
            const useCaseConfig = graphrag_js_1.default.useCases[useCase] || graphrag_js_1.default.useCases.default;
            useCaseConfig.promptSchema.parse({ question: validated.question });
            if (validated.maxTokens &&
                validated.maxTokens > useCaseConfig.tokenBudget) {
                throw new errors_js_1.UserFacingError(`Token budget exceeded: requested ${validated.maxTokens}, budget ${useCaseConfig.tokenBudget}`, "TOKEN_BUDGET_EXCEEDED");
            }
            const startTime = Date.now();
            try {
                logger.info(`GraphRAG query initiated. Investigation ID: ${validated.investigationId}, Question Length: ${validated.question.length}, Focus Entities: ${validated.focusEntityIds?.length || 0}`);
                // Step 1: Retrieve relevant subgraph with caching
                const subgraphContext = await this.retrieveSubgraphWithCache(validated);
                // Step 2: Generate response with enforced JSON schema
                const response = await this.generateResponseWithSchema(validated.question, subgraphContext, validated, useCaseConfig.outputSchema);
                response.why_paths = this.rankWhyPaths(response.why_paths, subgraphContext, validated.rankingStrategy);
                const responseTime = Date.now() - startTime;
                if (responseTime > useCaseConfig.latencyBudgetMs) {
                    logger.warn(`Latency budget exceeded for use case ${useCase}: ${responseTime}ms > ${useCaseConfig.latencyBudgetMs}ms`);
                }
                logger.info(`GraphRAG query completed. Investigation ID: ${validated.investigationId}, Response Time: ${responseTime}, Entities Retrieved: ${subgraphContext.entities.length}, Relationships Retrieved: ${subgraphContext.relationships.length}, Confidence: ${response.confidence}`);
                // Cache the final response
                if (this.redis && subgraphContext.subgraphHash) {
                    const responseCacheKey = `graphrag:response:${subgraphContext.subgraphHash}:${(0, crypto_1.createHash)("sha256").update(validated.question).digest("hex").substring(0, 16)}`;
                    try {
                        await this.redis.setex(responseCacheKey, subgraphContext.ttl, JSON.stringify(response));
                        logger.debug(`Cached GraphRAG response. Response Cache Key: ${responseCacheKey}`);
                    }
                    catch (error) {
                        logger.warn(`Redis response cache write failed. Error: ${error}`);
                    }
                }
                return response;
            }
            catch (error) {
                logger.error({
                    investigationId: validated.investigationId,
                    error: error instanceof Error ? error.message : "Unknown error",
                    traceId: error.traceId,
                }, "GraphRAG query failed");
                if (error instanceof errors_js_1.UserFacingError) {
                    throw error;
                }
                throw new Error(`GraphRAG query failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }); // End of circuitBreaker.execute
    }
    /**
     * Retrieve subgraph with Redis caching based on subgraph hash
     */
    async retrieveSubgraphWithCache(request) {
        // Create cache key from investigation + anchors + maxHops
        const cacheKey = this.createSubgraphCacheKey(request);
        const ttl = await this.getDynamicTTL(cacheKey);
        this.cacheStats.total++;
        if (this.redis) {
            try {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    this.cacheStats.hits++;
                    metrics_js_1.graphragCacheHitRatio.set(this.cacheStats.hits / this.cacheStats.total);
                    logger.debug(`Cache hit for subgraph. Cache Key: ${cacheKey}`);
                    await this.redis.expire(cacheKey, ttl);
                    return { ...JSON.parse(cached), ttl };
                }
            }
            catch (error) {
                logger.warn(`Redis cache read failed. Error: ${error}`);
            }
        }
        // Cache miss - retrieve from Neo4j
        const subgraph = await this.retrieveSubgraph(request);
        const subgraphHash = this.hashSubgraph(subgraph);
        const context = {
            ...subgraph,
            subgraphHash,
            ttl,
        };
        // Cache for future requests
        if (this.redis) {
            try {
                await this.redis.setex(cacheKey, ttl, JSON.stringify(context));
                logger.debug(`Cached subgraph. Cache Key: ${cacheKey}, Hash: ${subgraphHash}`);
            }
            catch (error) {
                logger.warn(`Redis cache write failed. Error: ${error}`);
            }
        }
        metrics_js_1.graphragCacheHitRatio.set(this.cacheStats.hits / this.cacheStats.total);
        return context;
    }
    async getDynamicTTL(cacheKey) {
        if (!this.redis) {
            return this.config.cacheTTL;
        }
        try {
            const freqKey = `graphrag:freq:${cacheKey}`;
            const count = await this.redis.incr(freqKey);
            await this.redis.expire(freqKey, this.config.cacheFreqWindow);
            await this.redis.zincrby("graphrag:popular_subgraphs", 1, cacheKey);
            const ttl = Math.min(this.config.maxCacheTTL, Math.round(this.config.cacheTTL * Math.log2(count + 1)));
            return ttl;
        }
        catch (error) {
            logger.warn(`Redis frequency tracking failed. Error: ${error}`);
            return this.config.cacheTTL;
        }
    }
    /**
     * Retrieve subgraph using k-hop traversal and motif patterns
     */
    async retrieveSubgraph(request) {
        const session = this.neo4j.session();
        try {
            const { investigationId, focusEntityIds = [], maxHops = 2 } = request;
            let cypher;
            let params;
            if (focusEntityIds.length > 0) {
                // Focused retrieval around specific entities
                cypher = `
          MATCH (anchor:Entity)
          WHERE anchor.id IN $focusIds AND anchor.investigationId = $investigationId
          CALL apoc.path.subgraphAll(anchor, {
            maxLevel: $maxHops,
            relationshipFilter: 'RELATIONSHIP>',
            labelFilter: 'Entity'
          }) YIELD nodes, relationships
          WITH collect(DISTINCT nodes) as nodeArrays, collect(DISTINCT relationships) as relArrays
          UNWIND apoc.coll.flatten(nodeArrays) as node
          UNWIND apoc.coll.flatten(relArrays) as rel
          WITH collect(DISTINCT node) as allNodes, collect(DISTINCT rel) as allRels
          RETURN allNodes as nodes, allRels as relationships
        `;
                params = { focusIds: focusEntityIds, investigationId, maxHops };
            }
            else {
                // General retrieval - get central entities and their neighborhoods
                cypher = `
          MATCH (e:Entity {investigationId: $investigationId})
          WITH e ORDER BY e.confidence DESC, e.createdAt DESC LIMIT 10
          CALL apoc.path.subgraphAll(e, {
            maxLevel: $maxHops,
            relationshipFilter: 'RELATIONSHIP>',
            labelFilter: 'Entity'
          }) YIELD nodes, relationships
          WITH collect(DISTINCT nodes) as nodeArrays, collect(DISTINCT relationships) as relArrays
          UNWIND apoc.coll.flatten(nodeArrays) as node
          UNWIND apoc.coll.flatten(relArrays) as rel
          WITH collect(DISTINCT node) as allNodes, collect(DISTINCT rel) as allRels
          RETURN allNodes as nodes, allRels as relationships
        `;
                params = { investigationId, maxHops };
            }
            const result = await session.run(cypher, params);
            if (!result.records.length) {
                return { entities: [], relationships: [] };
            }
            const record = result.records[0];
            const entities = this.parseEntities(record.get("nodes") || []);
            const relationships = this.parseRelationships(record.get("relationships") || []);
            return { entities, relationships };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Build concise string from Zod validation issues
     */
    summarizeZodIssues(error) {
        return error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
    }
    /**
     * Generate response with strict JSON schema enforcement and retry logic
     */
    async generateResponseWithSchema(question, context, request, schema) {
        const prompt = this.buildContextPrompt(question, context);
        const callLLMAndValidate = async (temp) => {
            const rawResponse = await this.llmService.complete({
                prompt,
                model: request.temperature !== undefined ? this.config.llmModel : undefined,
                maxTokens: request.maxTokens || 1000,
                temperature: temp,
                responseFormat: "json",
            });
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(rawResponse);
            }
            catch (error) {
                throw new Error("LLM returned invalid JSON");
            }
            const validatedResponse = schema.parse(parsedResponse);
            this.validateCitations(validatedResponse.citations, context);
            this.validateWhyPaths(validatedResponse.why_paths, context);
            return validatedResponse;
        };
        try {
            return await callLLMAndValidate(request.temperature || 0);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError ||
                (error instanceof Error &&
                    error.message.includes("LLM returned invalid JSON"))) {
                metrics_js_1.graphragSchemaFailuresTotal.inc();
                const summary = error instanceof zod_1.z.ZodError
                    ? this.summarizeZodIssues(error)
                    : error.message;
                logger.warn(`LLM schema violation or invalid JSON; retrying with temperature=0`, { issues: summary });
                try {
                    const retryResponse = await callLLMAndValidate(0); // Second attempt with stricter prompt/temperature=0
                    logger.info("LLM response validated on retry.");
                    return retryResponse;
                }
                catch (retryError) {
                    metrics_js_1.graphragSchemaFailuresTotal.inc();
                    const mapped = (0, errors_js_1.mapGraphRAGError)(retryError);
                    const retrySummary = retryError instanceof zod_1.z.ZodError
                        ? this.summarizeZodIssues(retryError)
                        : retryError instanceof Error
                            ? retryError.message
                            : "Unknown error";
                    logger.error("LLM schema invalid after retry", {
                        traceId: mapped.traceId,
                        issues: retrySummary,
                    });
                    throw mapped;
                }
            }
            throw (0, errors_js_1.mapGraphRAGError)(error);
        }
    }
    /**
     * Build context prompt for LLM with JSON schema requirements
     */
    buildContextPrompt(question, context) {
        const entityContext = context.entities
            .map((e) => `Entity ${e.id}: ${e.label} (${e.type}) - ${e.description || "No description"}`)
            .join("\n");
        const relationshipContext = context.relationships
            .map((r) => `Relationship ${r.id}: ${r.fromEntityId} --[${r.type}]--> ${r.toEntityId}`)
            .join("\n");
        return `You are an intelligence analyst with access to a knowledge graph. Answer the user's question based ONLY on the provided context.

CONTEXT ENTITIES:
${entityContext}

CONTEXT RELATIONSHIPS:
${relationshipContext}

USER QUESTION: ${question}

RESPONSE REQUIREMENTS:
- You MUST respond with valid JSON matching this exact schema
- answer: string (comprehensive answer based on context)
- confidence: number (0-1, based on context completeness and certainty)
- citations: object with entityIds array (entity IDs that support your answer)
- why_paths: array of objects with from, to, relId, type (relationship paths that explain your reasoning)

RESPONSE CONSTRAINTS:
- Only reference entities and relationships from the provided context
- If context is insufficient, state this clearly and set low confidence
- Include specific relationship IDs in why_paths that support your reasoning
- Cite all relevant entity IDs that contribute to your answer

Respond with JSON only:`;
    }
    /**
     * Validate that citations reference entities in the context
     */
    validateCitations(citations, context) {
        const availableEntityIds = new Set(context.entities.map((e) => e.id));
        const invalidCitations = citations.entityIds.filter((id) => !availableEntityIds.has(id));
        if (invalidCitations.length > 0) {
            throw new Error(`Invalid entity citations: ${invalidCitations.join(", ")}`);
        }
    }
    /**
     * Validate that why_paths reference actual relationships in the context
     */
    validateWhyPaths(whyPaths, context) {
        const availableRelIds = new Set(context.relationships.map((r) => r.id));
        const invalidPaths = whyPaths.filter((path) => !availableRelIds.has(path.relId));
        if (invalidPaths.length > 0) {
            const invalidIds = invalidPaths.map((p) => p.relId);
            throw new Error(`Invalid relationship IDs in why_paths: ${invalidIds.join(", ")}`);
        }
    }
    /**
     * Create cache key based on investigation, anchors, and hops
     */
    createSubgraphCacheKey(request) {
        const { investigationId, focusEntityIds = [], maxHops = 2 } = request;
        const sortedAnchors = [...focusEntityIds].sort();
        const keyData = `${investigationId}:${sortedAnchors.join(",")}:${maxHops}`;
        return `graphrag:subgraph:${(0, crypto_1.createHash)("sha256").update(keyData).digest("hex").substring(0, 16)}`;
    }
    rankWhyPaths(paths, context, strategy = "v2") {
        const centrality = {};
        for (const rel of context.relationships) {
            centrality[rel.fromEntityId] =
                (centrality[rel.fromEntityId] || 0) + 1;
            centrality[rel.toEntityId] =
                (centrality[rel.toEntityId] || 0) + 1;
        }
        const ranked = (0, PathRankingService_js_1.rankPaths)(paths, {
            nodeCentrality: centrality,
            strategy,
        });
        return ranked.map((r) => ({
            ...r.path,
            supportScore: r.score,
            score_breakdown: r.score_breakdown,
        }));
    }
    /**
     * Create hash of subgraph content for cache validation
     */
    hashSubgraph(subgraph) {
        const content = JSON.stringify({
            entities: subgraph.entities.map((e) => e.id).sort(),
            relationships: subgraph.relationships.map((r) => r.id).sort(),
        });
        return (0, crypto_1.createHash)("sha256").update(content).digest("hex").substring(0, 16);
    }
    /**
     * Parse Neo4j entities into typed Entity objects
     */
    parseEntities(nodes) {
        return nodes.map((node) => {
            const props = node.properties;
            return EntitySchema.parse({
                id: props.id,
                type: props.type,
                label: props.label,
                description: props.description || undefined,
                properties: props.properties ? JSON.parse(props.properties) : {},
                confidence: props.confidence || 1.0,
            });
        });
    }
    /**
     * Parse Neo4j relationships into typed Relationship objects
     */
    parseRelationships(rels) {
        return rels.map((rel) => {
            const props = rel.properties;
            return RelationshipSchema.parse({
                id: props.id,
                type: props.type,
                fromEntityId: props.fromEntityId,
                toEntityId: props.toEntityId,
                label: props.label || undefined,
                properties: props.properties ? JSON.parse(props.properties) : {},
                confidence: props.confidence || 1.0,
            });
        });
    }
    /**
     * Health check method
     */
    async getHealth() {
        let cacheStatus = "disabled";
        if (this.redis) {
            try {
                await this.redis.ping();
                cacheStatus = "healthy";
            }
            catch (error) {
                cacheStatus = "unhealthy";
            }
        }
        return {
            status: "healthy",
            cacheStatus,
            config: this.config,
            circuitBreaker: this.circuitBreaker.getMetrics(), // Expose circuit breaker metrics
        };
    }
}
exports.GraphRAGService = GraphRAGService;
//# sourceMappingURL=GraphRAGService.js.map