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

import { Driver, Session } from "neo4j-driver";
import { Redis } from "ioredis";
import { z } from "zod";
import { createHash } from "crypto";
import logger from '../config/logger';
import { CircuitBreaker } from "../utils/CircuitBreaker.js"; // Import CircuitBreaker
import { rankPaths, ScoreBreakdown } from "./PathRankingService.js";
import {
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
} from "../monitoring/metrics.js";
import { mapGraphRAGError, UserFacingError } from "../lib/errors.js";
import graphragConfig from "../config/graphrag.js";

const logger = logger.child({ name: "GraphRAGService" });

// Zod schemas for type safety and validation
const GraphRAGRequestSchema = z.object({
  investigationId: z.string().min(1),
  question: z.string().min(3),
  focusEntityIds: z.array(z.string()).optional(),
  maxHops: z.number().int().min(1).max(3).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(100).max(2000).optional(),
  useCase: z.string().optional().default("default"),
  rankingStrategy: z.enum(["v1", "v2"]).optional(),
});

const EntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  description: z.string().optional(),
  properties: z.record(z.any()),
  confidence: z.number().min(0).max(1),
});

const RelationshipSchema = z.object({
  id: z.string(),
  type: z.string(),
  fromEntityId: z.string(),
  toEntityId: z.string(),
  label: z.string().optional(),
  properties: z.record(z.any()),
  confidence: z.number().min(0).max(1),
});

const ScoreBreakdownSchema = z.object({
  length: z.number(),
  edgeType: z.number(),
  centrality: z.number(),
});

const WhyPathSchema = z.object({
  from: z.string(),
  to: z.string(),
  relId: z.string(),
  type: z.string(),
  supportScore: z.number().min(0).max(1).optional(),
  score_breakdown: ScoreBreakdownSchema.optional(),
});

const CitationsSchema = z.object({
  entityIds: z.array(z.string()),
});

// Strict JSON schema for LLM output validation
const GraphRAGResponseSchema = z.object({
  answer: z.string().min(1),
  confidence: z.number().min(0).max(1),
  citations: CitationsSchema,
  why_paths: z.array(WhyPathSchema),
});

// Types derived from schemas
export type GraphRAGRequest = z.infer<typeof GraphRAGRequestSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type WhyPath = z.infer<typeof WhyPathSchema>;
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;
export type Citations = z.infer<typeof CitationsSchema>;
export type GraphRAGResponse = z.infer<typeof GraphRAGResponseSchema>;

interface SubgraphContext {
  entities: Entity[];
  relationships: Relationship[];
  subgraphHash: string;
  ttl: number;
}

interface LLMService {
  complete(params: {
    prompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: "json";
  }): Promise<string>;
}

interface EmbeddingService {
  generateEmbedding(params: {
    text: string;
    model?: string;
  }): Promise<number[]>;
}

export class GraphRAGService {
  private neo4j: Driver;
  private redis: Redis | null;
  private llmService: LLMService;
  private embeddingService: EmbeddingService;
  private config: {
    maxContextSize: number;
    maxRetrievalDepth: number;
    minRelevanceScore: number;
    cacheTTL: number;
    maxCacheTTL: number;
    cacheFreqWindow: number;
    llmModel: string;
    embeddingModel: string;
  };
  private cacheStats = { hits: 0, total: 0 };
  private circuitBreaker: CircuitBreaker; // Declare circuit breaker instance

  constructor(
    neo4jDriver: Driver,
    llmService: LLMService,
    embeddingService: EmbeddingService,
    redisClient?: Redis,
  ) {
    this.neo4j = neo4jDriver;
    this.redis = redisClient || null;
    this.llmService = llmService;
    this.embeddingService = embeddingService;
    this.circuitBreaker = new CircuitBreaker({ // Initialize circuit breaker
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
  async answer(request: GraphRAGRequest): Promise<GraphRAGResponse> {
    return this.circuitBreaker.execute(async () => { // Wrap with circuit breaker
      const validated = GraphRAGRequestSchema.parse(request);
      const useCase = validated.useCase;
      const useCaseConfig =
        graphragConfig.useCases[useCase] || graphragConfig.useCases.default;
      useCaseConfig.promptSchema.parse({ question: validated.question });
      if (
        validated.maxTokens &&
        validated.maxTokens > useCaseConfig.tokenBudget
      ) {
        throw new UserFacingError(
          `Token budget exceeded: requested ${validated.maxTokens}, budget ${useCaseConfig.tokenBudget}`,
          "TOKEN_BUDGET_EXCEEDED",
        );
      }
      const startTime = Date.now();

      try {
        logger.info(
          `GraphRAG query initiated. Investigation ID: ${validated.investigationId}, Question Length: ${validated.question.length}, Focus Entities: ${validated.focusEntityIds?.length || 0}`,
        );

      // Step 1: Retrieve relevant subgraph with caching
      const subgraphContext = await this.retrieveSubgraphWithCache(validated);

      // Step 2: Generate response with enforced JSON schema
      const response = await this.generateResponseWithSchema(
        validated.question,
        subgraphContext,
        validated,
        useCaseConfig.outputSchema,
      );

      response.why_paths = this.rankWhyPaths(
        response.why_paths,
        subgraphContext,
        validated.rankingStrategy,
      );

      const responseTime = Date.now() - startTime;
      if (responseTime > useCaseConfig.latencyBudgetMs) {
        logger.warn(
          `Latency budget exceeded for use case ${useCase}: ${responseTime}ms > ${useCaseConfig.latencyBudgetMs}ms`,
        );
      }
      logger.info(
        `GraphRAG query completed. Investigation ID: ${validated.investigationId}, Response Time: ${responseTime}, Entities Retrieved: ${subgraphContext.entities.length}, Relationships Retrieved: ${subgraphContext.relationships.length}, Confidence: ${response.confidence}`,
      );

      // Cache the final response
      if (this.redis && subgraphContext.subgraphHash) {
        const responseCacheKey = `graphrag:response:${subgraphContext.subgraphHash}:${createHash("sha256").update(validated.question).digest("hex").substring(0, 16)}`;
        try {
          await this.redis.setex(
            responseCacheKey,
            subgraphContext.ttl,
            JSON.stringify(response),
          );
          logger.debug(
            `Cached GraphRAG response. Response Cache Key: ${responseCacheKey}`,
          );
        } catch (error) {
          logger.warn(`Redis response cache write failed. Error: ${error}`);
        }
      }

      return response;
    } catch (error) {
      logger.error(
        {
          investigationId: validated.investigationId,
          error: error instanceof Error ? error.message : "Unknown error",
          traceId: (error as any).traceId,
        },
        "GraphRAG query failed",
      );
      if (error instanceof UserFacingError) {
        throw error;
      }
      throw new Error(
        `GraphRAG query failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }); // End of circuitBreaker.execute
  }

  /**
   * Retrieve subgraph with Redis caching based on subgraph hash
   */
  private async retrieveSubgraphWithCache(
    request: GraphRAGRequest,
  ): Promise<SubgraphContext> {
    // Create cache key from investigation + anchors + maxHops
    const cacheKey = this.createSubgraphCacheKey(request);
    const ttl = await this.getDynamicTTL(cacheKey);

    this.cacheStats.total++;
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.cacheStats.hits++;
          graphragCacheHitRatio.set(
            this.cacheStats.hits / this.cacheStats.total,
          );
          logger.debug(`Cache hit for subgraph. Cache Key: ${cacheKey}`);
          await this.redis.expire(cacheKey, ttl);
          return { ...JSON.parse(cached), ttl };
        }
      } catch (error) {
        logger.warn(`Redis cache read failed. Error: ${error}`);
      }
    }

    // Cache miss - retrieve from Neo4j
    const subgraph = await this.retrieveSubgraph(request);
    const subgraphHash = this.hashSubgraph(subgraph);

    const context: SubgraphContext = {
      ...subgraph,
      subgraphHash,
      ttl,
    };

    // Cache for future requests
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, ttl, JSON.stringify(context));
        logger.debug(
          `Cached subgraph. Cache Key: ${cacheKey}, Hash: ${subgraphHash}`,
        );
      } catch (error) {
        logger.warn(`Redis cache write failed. Error: ${error}`);
      }
    }

    graphragCacheHitRatio.set(this.cacheStats.hits / this.cacheStats.total);
    return context;
  }

  private async getDynamicTTL(cacheKey: string): Promise<number> {
    if (!this.redis) {
      return this.config.cacheTTL;
    }
    try {
      const freqKey = `graphrag:freq:${cacheKey}`;
      const count = await this.redis.incr(freqKey);
      await this.redis.expire(freqKey, this.config.cacheFreqWindow);
      await this.redis.zincrby("graphrag:popular_subgraphs", 1, cacheKey);
      const ttl = Math.min(
        this.config.maxCacheTTL,
        Math.round(this.config.cacheTTL * Math.log2(count + 1)),
      );
      return ttl;
    } catch (error) {
      logger.warn(`Redis frequency tracking failed. Error: ${error}`);
      return this.config.cacheTTL;
    }
  }

  /**
   * Retrieve subgraph using k-hop traversal and motif patterns
   */
  private async retrieveSubgraph(
    request: GraphRAGRequest,
  ): Promise<{ entities: Entity[]; relationships: Relationship[] }> {
    const session = this.neo4j.session();

    try {
      const { investigationId, focusEntityIds = [], maxHops = 2 } = request;

      let cypher: string;
      let params: Record<string, any>;

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
      } else {
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
      const relationships = this.parseRelationships(
        record.get("relationships") || [],
      );

      return { entities, relationships };
    } finally {
      await session.close();
    }
  }

  /**
   * Build concise string from Zod validation issues
   */
  private summarizeZodIssues(error: z.ZodError): string {
    return error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
  }

  /**
   * Generate response with strict JSON schema enforcement and retry logic
   */
  private async generateResponseWithSchema(
    question: string,
    context: SubgraphContext,
    request: GraphRAGRequest,
    schema: z.ZodSchema,
  ): Promise<GraphRAGResponse> {
    const prompt = this.buildContextPrompt(question, context);

    const callLLMAndValidate = async (
      temp: number,
    ): Promise<GraphRAGResponse> => {
      const rawResponse = await this.llmService.complete({
        prompt,
        model:
          request.temperature !== undefined ? this.config.llmModel : undefined,
        maxTokens: request.maxTokens || 1000,
        temperature: temp,
        responseFormat: "json",
      });

      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(rawResponse);
      } catch (error) {
        throw new Error("LLM returned invalid JSON");
      }

      const validatedResponse = schema.parse(parsedResponse) as GraphRAGResponse;
      this.validateCitations(validatedResponse.citations, context);
      this.validateWhyPaths(validatedResponse.why_paths, context);
      return validatedResponse;
    };

    try {
      return await callLLMAndValidate(request.temperature || 0);
    } catch (error) {
      if (
        error instanceof z.ZodError ||
        (error instanceof Error &&
          error.message.includes("LLM returned invalid JSON"))
      ) {
        graphragSchemaFailuresTotal.inc();
        const summary =
          error instanceof z.ZodError
            ? this.summarizeZodIssues(error)
            : error.message;
        logger.warn(
          `LLM schema violation or invalid JSON; retrying with temperature=0`,
          { issues: summary },
        );
        try {
          const retryResponse = await callLLMAndValidate(0); // Second attempt with stricter prompt/temperature=0
          logger.info("LLM response validated on retry.");
          return retryResponse;
        } catch (retryError) {
          graphragSchemaFailuresTotal.inc();
          const mapped = mapGraphRAGError(retryError);
          const retrySummary =
            retryError instanceof z.ZodError
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
      throw mapGraphRAGError(error);
    }
  }

  /**
   * Build context prompt for LLM with JSON schema requirements
   */
  private buildContextPrompt(
    question: string,
    context: SubgraphContext,
  ): string {
    const entityContext = context.entities
      .map(
        (e) =>
          `Entity ${e.id}: ${e.label} (${e.type}) - ${e.description || "No description"}`,
      )
      .join("\n");

    const relationshipContext = context.relationships
      .map(
        (r) =>
          `Relationship ${r.id}: ${r.fromEntityId} --[${r.type}]--> ${r.toEntityId}`,
      )
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
  private validateCitations(
    citations: Citations,
    context: SubgraphContext,
  ): void {
    const availableEntityIds = new Set(context.entities.map((e) => e.id));
    const invalidCitations = citations.entityIds.filter(
      (id) => !availableEntityIds.has(id),
    );

    if (invalidCitations.length > 0) {
      throw new Error(
        `Invalid entity citations: ${invalidCitations.join(", ")}`,
      );
    }
  }

  /**
   * Validate that why_paths reference actual relationships in the context
   */
  private validateWhyPaths(
    whyPaths: WhyPath[],
    context: SubgraphContext,
  ): void {
    const availableRelIds = new Set(context.relationships.map((r) => r.id));
    const invalidPaths = whyPaths.filter(
      (path) => !availableRelIds.has(path.relId),
    );

    if (invalidPaths.length > 0) {
      const invalidIds = invalidPaths.map((p) => p.relId);
      throw new Error(
        `Invalid relationship IDs in why_paths: ${invalidIds.join(", ")}`,
      );
    }
  }

  /**
   * Create cache key based on investigation, anchors, and hops
   */
  private createSubgraphCacheKey(request: GraphRAGRequest): string {
    const { investigationId, focusEntityIds = [], maxHops = 2 } = request;
    const sortedAnchors = [...focusEntityIds].sort();
    const keyData = `${investigationId}:${sortedAnchors.join(",")}:${maxHops}`;
    return `graphrag:subgraph:${createHash("sha256").update(keyData).digest("hex").substring(0, 16)}`;
  }

  private rankWhyPaths(
    paths: WhyPath[],
    context: SubgraphContext,
    strategy: "v1" | "v2" = "v2",
  ): WhyPath[] {
    const centrality: Record<string, number> = {};
    for (const rel of context.relationships) {
      centrality[rel.fromEntityId] =
        (centrality[rel.fromEntityId] || 0) + 1;
      centrality[rel.toEntityId] =
        (centrality[rel.toEntityId] || 0) + 1;
    }

    const ranked = rankPaths(paths, {
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
  private hashSubgraph(subgraph: {
    entities: Entity[];
    relationships: Relationship[];
  }): string {
    const content = JSON.stringify({
      entities: subgraph.entities.map((e) => e.id).sort(),
      relationships: subgraph.relationships.map((r) => r.id).sort(),
    });
    return createHash("sha256").update(content).digest("hex").substring(0, 16);
  }

  /**
   * Parse Neo4j entities into typed Entity objects
   */
  private parseEntities(nodes: any[]): Entity[] {
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
  private parseRelationships(rels: any[]): Relationship[] {
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
  async getHealth(): Promise<{
    status: string;
    cacheStatus: string;
    config: typeof this.config;
  }> {
    let cacheStatus = "disabled";

    if (this.redis) {
      try {
        await this.redis.ping();
        cacheStatus = "healthy";
      } catch (error) {
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
