export const typeDefs = `
  scalar JSON
  scalar DateTime
  type Entity { id: ID!, type: String!, props: JSON, policy: JSON, labels: [String!], createdAt: DateTime!, updatedAt: DateTime, canonicalId: ID }
  type Relationship { id: ID!, from: ID!, to: ID!, type: String!, props: JSON, policy: JSON, labels: [String!], createdAt: DateTime! }
  type GeneratedEntitiesResult {
    entities: [Entity!]!
    relationships: [Relationship!]!
  }

type AISuggestionExplanation {
  score: Float!
  factors: [String!]!
  featureImportances: JSON
}

type AIRecommendation {
  from: ID!
  to: ID!
  score: Float!
  explanation: AISuggestionExplanation
}

type User {
  id: ID!
  email: String!
  username: String
  createdAt: DateTime!
  updatedAt: DateTime
}

input UserInput {
  email: String!
  username: String
}

type Investigation {
  id: ID!
  name: String!
  description: String
  createdAt: DateTime!
  updatedAt: DateTime
}

input InvestigationInput {
  name: String!
  description: String
}

type AuditLog {
  id: ID!
  userId: ID!
  action: String!
  resourceType: String!
  resourceId: String
  details: JSON
  investigationId: ID
  createdAt: DateTime!
}

input AuditLogFilter {
  userId: ID
  entityType: String
  from: DateTime
  to: DateTime
}

type LinkedEntity {
  text: String!
  label: String!
  startChar: Int!
  endChar: Int!
  entityId: ID # ID of the linked entity in the graph
}

input LinkedEntityInput {
  text: String!
  label: String!
  startChar: Int!
  endChar: Int!
  entityId: ID # ID of the linked entity in the graph
}

type ExtractedRelationship {
  sourceEntityId: ID!
  targetEntityId: ID!
  type: String!
  confidence: Float!
  textSpan: String!
}

# AI Analysis Schema
# Comprehensive AI-powered analysis capabilities for entity extraction,
# relationship detection, and intelligent insights generation

type ExtractedEntity {
  id: ID!
  text: String!
  type: String!
  confidence: Float!
  position: EntityPosition!
}

type EntityPosition {
  start: Int!
  end: Int!
}

type ExtractedAIRelationship {
  id: ID!
  source: String!
  target: String!
  type: String!
  confidence: Float!
}

type EntityExtractionResult {
  entities: [ExtractedEntity!]!
  relationships: [ExtractedAIRelationship!]!
}

type AnalyzedRelationship {
  id: ID!
  source: String!
  target: String!
  type: String!
  confidence: Float!
  context: String
  metadata: JSON
}

type SuggestedRelationship {
  type: String!
  reason: String!
  confidence: Float!
}

type RiskFactor {
  factor: String!
  severity: String!
  description: String!
}

type EntityInsights {
  entityId: ID!
  insights: [String!]!
  suggestedRelationships: [SuggestedRelationship!]!
  riskFactors: [RiskFactor!]!
  generatedAt: String!
}

type SentimentAnalysis {
  sentiment: String!
  confidence: Float!
  keywords: [String!]!
  metadata: JSON
}

type DataQualityInsight {
  id: ID!
  type: String!
  severity: String!
  message: String!
  suggestions: [String!]!
  affectedEntities: [ID!]!
}

type DataQualityReport {
  graphId: ID!
  overallScore: Float!
  insights: [DataQualityInsight!]!
  recommendations: [String!]!
  generatedAt: String!
}

type AppliedSuggestion {
  suggestionId: ID!
  applied: Boolean!
  message: String!
  changes: [String!]!
}

type AISuggestionResult {
  graphId: ID!
  appliedSuggestions: [AppliedSuggestion!]!
  totalChanges: Int!
  appliedAt: String!
}

type EntityEnhancements {
  properties: [String!]!
  relationships: [String!]!
  insights: [String!]!
}

type EntityEnhancementResult {
  entityId: ID!
  enhancements: EntityEnhancements!
  confidence: Float!
  enhancedAt: String!
}

type AIEnhancementResult {
  enhancements: [EntityEnhancementResult!]!
  totalEntitiesEnhanced: Int!
  totalEnhancementsApplied: Int!
}

# GraphRAG Types
"""
Input for GraphRAG queries with explainable output
"""
input GraphRAGQueryInput {
  """Investigation to query within"""
  investigationId: ID!
  
  """Natural language question"""
  question: String!
  
  """Optional entity IDs to focus the search around"""
  focusEntityIds: [ID!]
  
  """Maximum hops for graph traversal (1-3, default: 2)"""
  maxHops: Int
  
  """LLM temperature for response generation (0-1, default: 0)"""
  temperature: Float
  
  """Maximum tokens for LLM response (100-2000, default: 1000)"""
  maxTokens: Int

  """Use case identifier for prompt/response schemas"""
  useCase: String
  
  """Path ranking strategy (v1 or v2)"""
  rankingStrategy: String
}

"""
GraphRAG response with explainable reasoning
"""
type GraphRAGResponse {
  """Generated answer based on graph context"""
  answer: String!
  
  """Confidence score 0-1 based on context completeness"""
  confidence: Float!
  
  """Entity citations that support the answer"""
  citations: Citations!
  
  """Relationship paths that explain the reasoning"""
  why_paths: [WhyPath!]!
}

"""
Entity citations supporting the answer
"""
type Citations {
  """Entity IDs that were referenced in generating the answer"""
  entityIds: [ID!]!
}

"""
Explainable reasoning path through relationships
"""
type WhyPath {
  """Source entity ID"""
  from: ID!
  
  """Target entity ID"""
  to: ID!
  
  """Relationship ID connecting from -> to"""
  relId: ID!
  
  """Relationship type"""
  type: String!
  
  """Support score for this path (0-1, optional)"""
  supportScore: Float
  """Breakdown of scoring factors"""
  score_breakdown: ScoreBreakdown
}

type ScoreBreakdown {
  """Contribution from path length"""
  length: Float!
  """Contribution from edge type"""
  edgeType: Float!
  """Contribution from node centrality"""
  centrality: Float!
}

"""
Similar entity result with similarity score
"""
type SimilarEntity {
  """The similar entity"""
  entity: Entity!
  
  """Similarity score 0-1"""
  similarity: Float!
}

"""
Cache operation result
"""
type CacheOperationResult {
  """Whether the operation succeeded"""
  success: Boolean!

  """Human readable message"""
  message: String!
}

input SemanticSearchFilter {
  source: String
  dateFrom: DateTime
  dateTo: DateTime
  threatLevel: Int
}

  type Query {
    entity(id: ID!): Entity
    entities(type: String, q: String, limit: Int = 25, offset: Int = 0): [Entity!]!
    relationship(id: ID!): Relationship
    relationships(from: ID, to: ID, type: String, limit: Int = 25, offset: Int = 0): [Relationship!]!
    user(id: ID!): User
    users(limit: Int = 25, offset: Int = 0): [User!]!
    investigation(id: ID!): Investigation
    investigations(limit: Int = 25, offset: Int = 0): [Investigation!]!
    semanticSearch(query: String!, filters: SemanticSearchFilter, limit: Int = 10, offset: Int = 0): [Entity!]! # Enhanced query
    
    # AI Analysis Queries
    """
    Extract entities and relationships from text using AI/NLP techniques
    """
    extractEntities(
      text: String!
      extractRelationships: Boolean = false
      confidenceThreshold: Float = 0.7
    ): EntityExtractionResult!

    """
    Analyze potential relationships between a list of entities within given text
    """
    analyzeRelationships(
      entities: [String!]!
      text: String!
    ): [AnalyzedRelationship!]!

    """
    Generate AI-powered insights for a specific entity
    """
    generateEntityInsights(
      entityId: ID!
      entityType: String!
      properties: JSON = {}
    ): EntityInsights!

    """
    Perform sentiment analysis on text content
    """
    analyzeSentiment(
      text: String!
    ): SentimentAnalysis!

    """
    Get AI-generated insights about data quality and suggestions for improvement
    """
    getDataQualityInsights(
      graphId: ID
    ): DataQualityReport!

    """
    Query the knowledge graph using explainable GraphRAG.
    Returns structured response with answer, confidence, citations, and why_paths.
    """
    graphRagAnswer(input: GraphRAGQueryInput!): GraphRAGResponse!
    
    """
    Find entities similar to the given entity or text.
    Uses vector embeddings for semantic similarity.
    """
    similarEntities(
      entityId: ID
      text: String
      topK: Int = 10
      investigationId: ID!
    ): [SimilarEntity!]!
    auditTrace(
      investigationId: ID!
      filter: AuditLogFilter
    ): [AuditLog!]!
  }
  
  input EntityInput { type: String!, props: JSON }
  input RelationshipInput { from: ID!, to: ID!, type: String!, props: JSON }
  
  type Mutation {
    createEntity(input: EntityInput!): Entity!
    updateEntity(id: ID!, input: EntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
    createRelationship(input: RelationshipInput!): Relationship!
    updateRelationship(id: ID!, input: RelationshipInput!): Relationship!
    deleteRelationship(id: ID!): Boolean!
    setEntityPolicy(id: ID!, policy: JSON!, labels: [String!]): Entity!
    clearEntityPolicy(id: ID!): Entity!
    setRelationshipPolicy(id: ID!, policy: JSON!, labels: [String!]): Relationship!
    clearRelationshipPolicy(id: ID!): Relationship!
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserInput!): User!
    deleteUser(id: ID!): Boolean!
    createInvestigation(input: InvestigationInput!): Investigation!
    updateInvestigation(id: ID!, input: InvestigationInput!): Investigation!
    deleteInvestigation(id: ID!): Boolean!
    linkEntities(text: String!): [LinkedEntity!]!
    extractRelationships(text: String!, entities: [LinkedEntityInput!]!): [ExtractedRelationship!]!
    generateEntitiesFromText(investigationId: ID!, text: String!): GeneratedEntitiesResult!

    # AI Analysis Mutations
    """
    Apply AI-generated suggestions to improve graph structure and data quality
    """
    applyAISuggestions(
      graphId: ID!
      suggestionIds: [ID!]!
    ): AISuggestionResult!

    """
    Use AI to enhance entities with additional properties, relationships, and insights
    """
    enhanceEntitiesWithAI(
      entityIds: [ID!]!
      enhancementTypes: [String!] = ["properties", "relationships", "insights"]
    ): AIEnhancementResult!

    """
    Clear GraphRAG cache for an investigation.
    Useful when investigation data has changed significantly.
    """
    clearGraphRAGCache(investigationId: ID!): CacheOperationResult!
  }
  
  type Subscription {
    entityCreated: Entity!
    entityUpdated: Entity!
    entityDeleted: ID!
    aiRecommendationUpdated: AIRecommendation!
  }
`;
