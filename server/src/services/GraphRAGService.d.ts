// server/src/services/GraphRAGService.d.ts
import { JSONSchemaType } from "ajv"; // Assuming ajv is correctly typed
import { Driver } from "neo4j-driver"; // Assuming neo4j-driver is correctly typed
import { Redis } from "ioredis"; // Assuming ioredis is correctly typed
import pino from "pino"; // Assuming pino is correctly typed

// Re-declare types from GraphRAGService.ts
export type ScoreBreakdown = {
  length: number;
  edgeType: number;
  centrality: number;
};
export type WhyPath = {
  from: string;
  to: string;
  relId: string;
  type: string;
  supportScore?: number;
  score_breakdown?: ScoreBreakdown;
};
export type RAG = {
  answer: string;
  confidence: number;
  citations: { entityIds: string[] };
  why_paths: WhyPath[];
};

// Re-declare the main service class
export class GraphRAGService {
  constructor(
    neo4jDriver: Driver,
    llmService: any,
    embeddingService: any,
    redisClient?: Redis,
  );
  answer(req: {
    investigationId: string;
    question: string;
    focusEntityIds?: string[];
    maxHops?: number;
    rankingStrategy?: string;
  }): Promise<RAG>;
  getPopularSubgraphs(
    limit?: number,
  ): Promise<{ key: string; count: number }[]>;
  // Add other public methods if needed
}

// Export the types with their original names
export type GraphRAGRequest = {
  investigationId: string;
  question: string;
  focusEntityIds?: string[];
  maxHops?: number;
  temperature?: number;
  maxTokens?: number;
  useCase?: string;
  rankingStrategy?: string;
};

export type GraphRAGResponse = RAG;
