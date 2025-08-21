import EmbeddingService from "./EmbeddingService.js";
import logger from '../config/logger';

export interface IndexDocumentInput {
  id: string;
  text: string;
  graphId?: string;
  source?: string;
  date?: string;
  threatLevel?: number;
}

export interface SemanticSearchFilters {
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  threatLevel?: number;
}

export interface SemanticSearchResult {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, any>;
}

export default class SemanticSearchService {
  private client: any;
  private embeddingService: EmbeddingService;
  private indexName: string;
  private logger = logger.child({ name: "SemanticSearchService" });

  constructor(client?: any, embeddingService?: EmbeddingService) {
    this.client = client || null;
    this.embeddingService = embeddingService || new EmbeddingService();
    this.indexName = process.env.WEAVIATE_INDEX || "IngestedDocument";
  }

  private async getClient() {
    if (this.client) return this.client;
    try {
      const weaviate = await import("weaviate-ts-client");
      const apiKey = process.env.WEAVIATE_API_KEY
        ? new weaviate.ApiKey(process.env.WEAVIATE_API_KEY)
        : undefined;
      this.client = weaviate.client({
        scheme: process.env.WEAVIATE_SCHEME || "http",
        host: process.env.WEAVIATE_HOST || "localhost:8080",
        apiKey,
      });
      return this.client;
    } catch (err: any) {
      this.logger.error({ err }, "Failed to initialize Weaviate client");
      throw new Error("Weaviate client not available");
    }
  }

  async indexDocument(doc: IndexDocumentInput) {
    const client = await this.getClient();
    const vector = await this.embeddingService.generateEmbedding({
      text: doc.text,
    });
    await client.data
      .creator()
      .withClassName(this.indexName)
      .withId(doc.id)
      .withVector(vector)
      .withProperties({
        text: doc.text,
        graphId: doc.graphId,
        source: doc.source,
        date: doc.date,
        threatLevel: doc.threatLevel,
      })
      .do();
  }

  async search(
    query: string,
    filters: SemanticSearchFilters = {},
    limit = 10,
  ): Promise<SemanticSearchResult[]> {
    const client = await this.getClient();
    const vector = await this.embeddingService.generateEmbedding({
      text: query,
    });

    const operands: any[] = [];
    if (filters.source) {
      operands.push({
        path: ["source"],
        operator: "Equal",
        valueString: filters.source,
      });
    }
    if (filters.threatLevel !== undefined) {
      operands.push({
        path: ["threatLevel"],
        operator: "Equal",
        valueInt: filters.threatLevel,
      });
    }
    if (filters.dateFrom) {
      operands.push({
        path: ["date"],
        operator: "GreaterThanEqual",
        valueDate: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      operands.push({
        path: ["date"],
        operator: "LessThanEqual",
        valueDate: filters.dateTo,
      });
    }

    const where =
      operands.length > 0 ? { operator: "And", operands } : undefined;

    const result = await client.graphql
      .get()
      .withClassName(this.indexName)
      .withFields(
        "id text source date threatLevel graphId _additional { distance }",
      )
      .withNearVector({ vector })
      .withWhere(where)
      .withLimit(limit)
      .do();

    const docs = result?.data?.Get?.[this.indexName] || [];
    return docs.map((d: any) => ({
      id: d.id,
      text: d.text,
      score: 1 - (d._additional?.distance ?? 0),
      metadata: {
        source: d.source,
        date: d.date,
        threatLevel: d.threatLevel,
        graphId: d.graphId,
      },
    }));
  }
}
