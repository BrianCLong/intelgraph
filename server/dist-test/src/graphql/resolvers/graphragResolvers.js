"use strict";
/**
 * GraphRAG GraphQL Resolvers (TypeScript)
 * Provides GraphQL interface for explainable GraphRAG operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphragResolvers = void 0;
exports.getGraphRAGHealth = getGraphRAGHealth;
const GraphRAGService_js_1 = require("../../services/GraphRAGService.js");
const EmbeddingService_js_1 = __importDefault(require("../../services/EmbeddingService.js"));
const LLMService_js_1 = __importDefault(require("../../services/LLMService.js"));
const SimilarityService_js_1 = require("../../services/SimilarityService.js");
const database_js_1 = require("../../config/database.js");
const graphql_1 = require("graphql");
const logger = logger.child({ name: "graphragResolvers" });
// Service initialization
let graphRAGService = null;
let embeddingService;
let llmService;
function initializeServices() {
    if (!graphRAGService) {
        const neo4jDriver = (0, database_js_1.getNeo4jDriver)();
        const redisClient = (0, database_js_1.getRedisClient)();
        embeddingService = new EmbeddingService_js_1.default();
        llmService = new LLMService_js_1.default();
        graphRAGService = new GraphRAGService_js_1.GraphRAGService(neo4jDriver, llmService, embeddingService, redisClient);
        logger.info("GraphRAG services initialized");
    }
    return graphRAGService;
}
exports.graphragResolvers = {
    Query: {
        /**
         * Query the knowledge graph using explainable GraphRAG
         */
        graphRagAnswer: async (_, args, context) => {
            if (!context.user) {
                throw new Error("Authentication required");
            }
            const service = initializeServices();
            const { input } = args;
            try {
                logger.info(`GraphRAG query received. Investigation ID: ${input.investigationId}, User ID: ${context.user.id}, Question Length: ${input.question.length}, Use Case: ${input.useCase || "default"}`);
                const request = {
                    investigationId: input.investigationId,
                    question: input.question,
                    focusEntityIds: input.focusEntityIds,
                    maxHops: input.maxHops,
                    temperature: input.temperature,
                    maxTokens: input.maxTokens,
                    useCase: input.useCase,
                    rankingStrategy: input.rankingStrategy,
                };
                const response = await service.answer(request);
                logger.info(`GraphRAG query completed. Investigation ID: ${input.investigationId}, User ID: ${context.user.id}, Confidence: ${response.confidence}, Citations Count: ${response.citations.entityIds.length}, Why Paths Count: ${response.why_paths.length}`);
                return response;
            }
            catch (error) {
                logger.error(`GraphRAG query failed. Investigation ID: ${input.investigationId}, User ID: ${context.user.id}, Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                if (error instanceof Error &&
                    error.message === "LLM schema invalid after retry") {
                    throw new graphql_1.GraphQLError("Invalid LLM response format", {
                        extensions: { code: "BAD_REQUEST" },
                    });
                }
                throw new Error(error instanceof Error
                    ? `GraphRAG query failed: ${error.message}`
                    : "GraphRAG query failed: Unknown error");
            }
        },
        /**
         * Get similar entities using embedding search
         */
        similarEntities: async (_, args, context) => {
            if (!context.user) {
                throw new Error("Authentication required");
            }
            const { entityId, text, topK = 10, investigationId } = args;
            try {
                logger.info(`Similarity search requested. Entity ID: ${entityId}, Text: ${text?.substring(0, 50)}, Top K: ${topK}, Investigation ID: ${investigationId}, User ID: ${context.user.id}`);
                const result = await SimilarityService_js_1.similarityService.findSimilar({
                    investigationId,
                    entityId,
                    text,
                    topK,
                    threshold: 0.7,
                    includeText: true,
                });
                // TODO: Fetch full entity objects from Neo4j using the entity IDs
                // For now, return simplified entity structure
                const similarEntities = result.results.map((similar) => ({
                    entity: {
                        id: similar.entityId,
                        // These would be populated from actual entity lookup
                        type: "unknown",
                        label: similar.text?.substring(0, 50) || "Unknown",
                        description: similar.text || "",
                        properties: {},
                        confidence: similar.similarity,
                    },
                    similarity: similar.similarity,
                }));
                logger.info(`Similarity search completed. Investigation ID: ${investigationId}, User ID: ${context.user.id}, Results Count: ${similarEntities.length}, Execution Time: ${result.executionTime}`);
                return similarEntities;
            }
            catch (error) {
                logger.error(`Similarity search failed. Entity ID: ${entityId}, Investigation ID: ${investigationId}, User ID: ${context.user.id}, Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                throw new Error(`Similarity search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        },
    },
    Mutation: {
        /**
         * Clear GraphRAG cache for an investigation
         */
        clearGraphRAGCache: async (_, args, context) => {
            if (!context.user) {
                throw new Error("Authentication required");
            }
            const service = initializeServices();
            const { investigationId } = args;
            try {
                // Implementation would clear Redis cache entries for the investigation
                logger.info(`GraphRAG cache clear requested. Investigation ID: ${investigationId}, User ID: ${context.user.id}`);
                // TODO: Implement cache clearing logic
                return {
                    success: true,
                    message: `Cache cleared for investigation ${investigationId}`,
                };
            }
            catch (error) {
                logger.error(`Cache clear failed. Investigation ID: ${investigationId}, User ID: ${context.user.id}, Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                return {
                    success: false,
                    message: "Failed to clear cache",
                };
            }
        },
    },
    // Custom scalar and object resolvers
    GraphRAGResponse: {
        answer: (parent) => parent.answer,
        confidence: (parent) => parent.confidence,
        citations: (parent) => parent.citations,
        why_paths: (parent) => parent.why_paths,
    },
    WhyPath: {
        from: (parent) => parent.from,
        to: (parent) => parent.to,
        relId: (parent) => parent.relId,
        type: (parent) => parent.type,
        supportScore: (parent) => parent.supportScore || 1.0,
        score_breakdown: (parent) => parent.score_breakdown,
    },
    Citations: {
        entityIds: (parent) => parent.entityIds,
    },
};
/**
 * Health check for GraphRAG service
 */
async function getGraphRAGHealth() {
    try {
        const service = initializeServices();
        return await service.getHealth();
    }
    catch (error) {
        logger.error(`GraphRAG health check failed. Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        return {
            status: "unhealthy",
            cacheStatus: "unknown",
            config: {},
        };
    }
}
exports.default = exports.graphragResolvers;
//# sourceMappingURL=graphragResolvers.js.map