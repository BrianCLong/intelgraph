/**
 * GraphRAG GraphQL Schema Types
 * Type definitions for GraphRAG operations
 */
const gql = require('graphql-tag');
const graphragTypes = gql `
  # GraphRAG Query Input
  input GraphRAGQueryInput {
    query: String!
    investigationId: String!
    context: JSON
    maxResults: Int
    depth: Int
    expansionLimit: Int
    model: String
    temperature: Float
    maxTokens: Int
    useCase: String
  }

  # GraphRAG Query Response
  type GraphRAGResponse {
    success: Boolean!
    queryId: String
    response: String
    metadata: GraphRAGMetadata
    error: String
  }

  # GraphRAG Metadata
  type GraphRAGMetadata {
    contextSize: Int!
    relevanceScore: Float!
    sources: [GraphRAGSource!]!
    responseTime: Int!
  }

  # GraphRAG Source
  type GraphRAGSource {
    type: String!
    id: String!
    score: Float!
  }

  # Health Check Response
  type GraphRAGHealthResponse {
    status: String!
    services: GraphRAGServices
    error: String
    timestamp: String!
  }

  # Service Health Status
  type GraphRAGServices {
    graphRAG: ServiceHealth!
    embedding: ServiceHealth!
    llm: ServiceHealth!
  }

  type ServiceHealth {
    status: String!
    provider: String
    model: String
    metrics: ServiceMetrics
    config: JSON
  }

  type ServiceMetrics {
    totalQueries: Int
    totalCompletions: Int
    totalEmbeddings: Int
    averageLatency: Int
    averageResponseTime: Int
    errorCount: Int
    successRate: String
    cacheHitRate: Float
    averageRelevance: Float
    averageContextSize: Int
    totalTokensGenerated: Int
    averageTokensPerCompletion: Int
    batchCount: Int
  }

  # Find Similar Entities Input
  input FindSimilarEntitiesInput {
    entityId: String!
    investigationId: String!
    limit: Int
    threshold: Float
  }

  # Similar Entities Response
  type SimilarEntitiesResponse {
    success: Boolean!
    results: [SimilarEntityResult!]!
    queryEntity: EntityInfo
    error: String
  }

  type SimilarEntityResult {
    entity: EntityInfo!
    similarity: Float!
  }

  type EntityInfo {
    id: String!
    label: String
    description: String
    properties: JSON
  }

  # Generate Embeddings Input
  input GenerateEmbeddingsInput {
    investigationId: String!
    batchSize: Int
    model: String
  }

  # Generate Embeddings Response
  type GenerateEmbeddingsResponse {
    success: Boolean!
    message: String!
    processedCount: Int!
    totalEntities: Int!
  }

  # Test Services Response
  type TestServicesResponse {
    success: Boolean!
    embedding: TestResult!
    llm: TestResult!
    error: String
    timestamp: String!
  }

  type TestResult {
    success: Boolean!
    response: String
    dimension: Int
    sampleValues: [Float]
    error: String
  }

  # Extend root Query type
  extend type Query {
    """
    Query the knowledge graph using GraphRAG for intelligent responses
    """
    graphRAGQuery(input: GraphRAGQueryInput!): GraphRAGResponse!

    """
    Get health status and metrics for GraphRAG services
    """
    graphRAGHealth: GraphRAGHealthResponse!

    """
    Find entities similar to a given entity using semantic embeddings
    """
    findSimilarEntities(input: FindSimilarEntitiesInput!): SimilarEntitiesResponse!
  }

  # Extend root Mutation type
  extend type Mutation {
    """
    Generate embeddings for entities in an investigation
    """
    generateEntityEmbeddings(input: GenerateEmbeddingsInput!): GenerateEmbeddingsResponse!

    """
    Test GraphRAG services (embedding and LLM)
    """
    testGraphRAGServices: TestServicesResponse!
  }

  # Subscription for real-time GraphRAG updates
  extend type Subscription {
    """
    Subscribe to GraphRAG query results
    """
    graphRAGQueryProgress(queryId: String!): GraphRAGResponse!

    """
    Subscribe to embedding generation progress
    """
    embeddingGenerationProgress(investigationId: String!): GenerateEmbeddingsResponse!
  }
`;
module.exports = graphragTypes;
//# sourceMappingURL=graphragTypes.js.map