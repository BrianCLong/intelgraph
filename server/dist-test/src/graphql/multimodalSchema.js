/**
 * Multimodal Data Schema Extension
 * P0 Critical - MVP1 requirement for cross-modal entity extraction
 * Supports text, image, audio, and video data sources
 */
const gql = require('graphql-tag');
const multimodalTypeDefs = gql `
  # Multimodal Data Types
  enum MediaType {
    TEXT
    IMAGE
    AUDIO
    VIDEO
    DOCUMENT
    GEOSPATIAL
    TEMPORAL
    MULTIMODAL_COMPOSITE
  }

  enum ExtractionMethod {
    NLP_SPACY
    NLP_TRANSFORMERS
    COMPUTER_VISION
    OCR_TESSERACT
    SPEECH_TO_TEXT
    VIDEO_ANALYSIS
    GEOINT_PROCESSING
    MANUAL_ANNOTATION
    AI_HYBRID
  }

  enum MediaQuality {
    LOW
    MEDIUM
    HIGH
    REFERENCE_QUALITY
  }

  enum ProcessingStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    FAILED
    PARTIALLY_PROCESSED
    NEEDS_REVIEW
  }

  enum ConfidenceLevel {
    VERY_LOW
    LOW
    MEDIUM
    HIGH
    VERY_HIGH
    HUMAN_VERIFIED
  }

  # Core Multimodal Types
  type MediaSource {
    id: ID!
    uri: String!
    mediaType: MediaType!
    mimeType: String!
    filename: String
    filesize: Int
    duration: Float # seconds for audio/video
    dimensions: MediaDimensions # for images/video
    quality: MediaQuality!
    checksum: String!
    uploadedBy: User!
    uploadedAt: DateTime!
    metadata: JSON!
  }

  type MediaDimensions {
    width: Int!
    height: Int!
    aspectRatio: Float!
  }

  # Enhanced Entity with Multimodal Support
  type MultimodalEntity {
    id: ID!
    uuid: String!
    type: EntityType!
    label: String!
    description: String
    properties: JSON!
    confidence: Float!
    confidenceLevel: ConfidenceLevel!
    
    # Multimodal specific fields
    extractedFrom: [MediaSource!]!
    extractionMethod: ExtractionMethod!
    boundingBoxes: [BoundingBox!]! # Location within media
    temporalBounds: [TemporalBound!]! # Time bounds for audio/video
    spatialContext: SpatialContext # Geographic context
    
    # Cross-modal references
    crossModalMatches: [CrossModalMatch!]!
    similarEntities: [EntitySimilarity!]!
    
    # Verification and provenance
    verified: Boolean!
    verifiedBy: User
    verifiedAt: DateTime
    provenance: [ExtractionProvenance!]!
    
    # Graph relationships
    relationships: [MultimodalRelationship!]!
    investigations: [Investigation!]!
    
    # Audit
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type BoundingBox {
    mediaSourceId: ID!
    x: Float! # normalized coordinates (0-1)
    y: Float!
    width: Float!
    height: Float!
    confidence: Float!
    extractedAt: DateTime!
  }

  type TemporalBound {
    mediaSourceId: ID!
    startTime: Float! # seconds
    endTime: Float!
    confidence: Float!
    transcript: String # for audio/video
    extractedAt: DateTime!
  }

  type SpatialContext {
    latitude: Float
    longitude: Float
    elevation: Float
    accuracy: Float # meters
    source: String # GPS, EXIF, etc.
    extractedAt: DateTime!
  }

  type CrossModalMatch {
    matchedEntityId: ID!
    sourceMediaType: MediaType!
    targetMediaType: MediaType!
    similarity: Float!
    matchingFeatures: [String!]!
    confidence: Float!
    algorithm: String!
    computedAt: DateTime!
  }

  type EntitySimilarity {
    entityId: ID!
    similarity: Float!
    semanticDistance: Float
    visualSimilarity: Float
    contextualSimilarity: Float
    overallConfidence: Float!
    comparedFeatures: [String!]!
  }

  # Enhanced Relationships with Multimodal Support
  type MultimodalRelationship {
    id: ID!
    uuid: String!
    type: RelationshipType!
    label: String!
    description: String
    properties: JSON!
    weight: Float
    confidence: Float!
    confidenceLevel: ConfidenceLevel!
    
    # Temporal validity
    validFrom: DateTime
    validTo: DateTime
    
    # Multimodal extraction context
    extractedFrom: [MediaSource!]!
    extractionMethod: ExtractionMethod!
    spatialContext: [SpatialContext!]!
    temporalContext: [TemporalBound!]!
    
    # Source and target entities
    sourceEntity: MultimodalEntity!
    targetEntity: MultimodalEntity!
    
    # Cross-modal evidence
    supportingEvidence: [Evidence!]!
    
    # Verification
    verified: Boolean!
    verifiedBy: User
    verifiedAt: DateTime
    
    # Audit
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Evidence {
    id: ID!
    type: String! # textual, visual, auditory, spatial, temporal
    content: String!
    mediaSource: MediaSource
    confidence: Float!
    relevanceScore: Float!
    extractionMethod: ExtractionMethod!
    boundingBox: BoundingBox
    temporalBound: TemporalBound
    createdAt: DateTime!
  }

  type ExtractionProvenance {
    id: ID!
    mediaSourceId: ID!
    extractorName: String!
    extractorVersion: String!
    modelName: String
    modelVersion: String
    extractionMethod: ExtractionMethod!
    processingParams: JSON!
    confidence: Float!
    processedAt: DateTime!
    processingDuration: Float! # milliseconds
    errors: [String!]!
    warnings: [String!]!
  }

  # Processing Pipeline Types
  type ExtractionJob {
    id: ID!
    mediaSourceId: ID!
    extractionMethods: [ExtractionMethod!]!
    status: ProcessingStatus!
    progress: Float! # 0.0 to 1.0
    startedAt: DateTime
    completedAt: DateTime
    duration: Float # milliseconds
    entitiesExtracted: Int!
    relationshipsExtracted: Int!
    errors: [ProcessingError!]!
    warnings: [String!]!
    results: ExtractionResults
  }

  type ProcessingError {
    code: String!
    message: String!
    severity: String!
    timestamp: DateTime!
    context: JSON
  }

  type ExtractionResults {
    entities: [MultimodalEntity!]!
    relationships: [MultimodalRelationship!]!
    summary: ExtractionSummary!
    qualityMetrics: QualityMetrics!
  }

  type ExtractionSummary {
    totalEntities: Int!
    entitiesByType: JSON!
    totalRelationships: Int!
    relationshipsByType: JSON!
    averageConfidence: Float!
    processingTime: Float!
    dataQualityScore: Float!
  }

  type QualityMetrics {
    overallScore: Float!
    extractionAccuracy: Float
    crossModalConsistency: Float
    temporalConsistency: Float
    spatialAccuracy: Float
    duplicateRate: Float
    verificationRate: Float
  }

  # Multimodal Search and Analytics
  type MultimodalSearchResults {
    entities: [MultimodalEntity!]!
    relationships: [MultimodalRelationship!]!
    mediaSources: [MediaSource!]!
    crossModalMatches: [CrossModalMatch!]!
    totalCount: Int!
    searchTime: Float!
    qualityScore: Float!
  }

  type SemanticCluster {
    id: String!
    label: String!
    entities: [MultimodalEntity!]!
    centroid: [Float!]! # embedding vector
    radius: Float!
    coherence: Float!
    mediaTypes: [MediaType!]!
    dominantType: EntityType!
    confidence: Float!
  }

  type MultimodalAnalytics {
    investigationId: ID!
    mediaDistribution: JSON!
    extractionMethodMetrics: JSON!
    confidenceDistribution: JSON!
    crossModalMatches: Int!
    verificationRate: Float!
    qualityScore: Float!
    temporalCoverage: JSON!
    spatialCoverage: JSON!
    semanticClusters: [SemanticCluster!]!
    generatedAt: DateTime!
  }

  # Input Types
  input MediaSourceInput {
    uri: String!
    mediaType: MediaType!
    mimeType: String!
    filename: String
    metadata: JSON
  }

  input CreateMultimodalEntityInput {
    type: EntityType!
    label: String!
    description: String
    properties: JSON!
    extractedFrom: [ID!]! # MediaSource IDs
    extractionMethod: ExtractionMethod!
    confidence: Float!
    boundingBoxes: [BoundingBoxInput!]
    temporalBounds: [TemporalBoundInput!]
    spatialContext: SpatialContextInput
    investigationId: ID!
  }

  input BoundingBoxInput {
    mediaSourceId: ID!
    x: Float!
    y: Float!
    width: Float!
    height: Float!
    confidence: Float!
  }

  input TemporalBoundInput {
    mediaSourceId: ID!
    startTime: Float!
    endTime: Float!
    confidence: Float!
    transcript: String
  }

  input SpatialContextInput {
    latitude: Float
    longitude: Float
    elevation: Float
    accuracy: Float
    source: String
  }

  input CreateMultimodalRelationshipInput {
    sourceId: ID!
    targetId: ID!
    type: RelationshipType!
    label: String
    properties: JSON
    extractedFrom: [ID!]! # MediaSource IDs
    extractionMethod: ExtractionMethod!
    confidence: Float!
    validFrom: DateTime
    validTo: DateTime
    spatialContext: [SpatialContextInput!]
    temporalContext: [TemporalBoundInput!]
  }

  input ExtractionJobInput {
    mediaSourceId: ID!
    extractionMethods: [ExtractionMethod!]!
    investigationId: ID!
    processingParams: JSON
  }

  input MultimodalSearchInput {
    query: String!
    mediaTypes: [MediaType!]
    entityTypes: [EntityType!]
    investigationId: ID
    includeCrossModal: Boolean = true
    minConfidence: Float = 0.5
    limit: Int = 50
  }

  input SemanticSearchInput {
    embedding: [Float!]!
    mediaTypes: [MediaType!]
    threshold: Float = 0.7
    limit: Int = 20
  }

  # Extended Query Types
  extend type Query {
    # Media Sources
    mediaSources(investigationId: ID, mediaType: MediaType, limit: Int = 50): [MediaSource!]!
    mediaSource(id: ID!): MediaSource
    
    # Multimodal Entities and Relationships
    multimodalEntities(
      investigationId: ID
      mediaType: MediaType
      extractionMethod: ExtractionMethod
      minConfidence: Float
      limit: Int = 50
    ): [MultimodalEntity!]!
    multimodalEntity(id: ID!): MultimodalEntity
    multimodalRelationships(
      investigationId: ID
      sourceEntityId: ID
      targetEntityId: ID
      limit: Int = 50
    ): [MultimodalRelationship!]!
    
    # Cross-modal matching
    findCrossModalMatches(
      entityId: ID!
      targetMediaTypes: [MediaType!]
      minSimilarity: Float = 0.7
      limit: Int = 10
    ): [CrossModalMatch!]!
    
    # Processing and Jobs
    extractionJobs(
      investigationId: ID
      status: ProcessingStatus
      limit: Int = 20
    ): [ExtractionJob!]!
    extractionJob(id: ID!): ExtractionJob
    
    # Search and Analytics
    multimodalSearch(input: MultimodalSearchInput!): MultimodalSearchResults!
    semanticSearch(input: SemanticSearchInput!): [MultimodalEntity!]!
    multimodalAnalytics(investigationId: ID!): MultimodalAnalytics!
    
    # Quality and Verification
    unverifiedEntities(
      investigationId: ID
      mediaType: MediaType
      minConfidence: Float
      limit: Int = 50
    ): [MultimodalEntity!]!
    duplicateEntities(
      investigationId: ID
      similarity: Float = 0.9
      limit: Int = 50
    ): [[MultimodalEntity!]!]!
  }

  # Extended Mutation Types
  extend type Mutation {
    # Media Upload and Management
    uploadMedia(input: MediaSourceInput!): MediaSource!
    deleteMediaSource(id: ID!): Boolean!
    updateMediaMetadata(id: ID!, metadata: JSON!): MediaSource!
    
    # Entity Creation and Management
    createMultimodalEntity(input: CreateMultimodalEntityInput!): MultimodalEntity!
    updateMultimodalEntity(id: ID!, input: CreateMultimodalEntityInput!): MultimodalEntity!
    verifyMultimodalEntity(id: ID!, verified: Boolean!): MultimodalEntity!
    mergeMultimodalEntities(primaryId: ID!, secondaryIds: [ID!]!): MultimodalEntity!
    
    # Relationship Management
    createMultimodalRelationship(input: CreateMultimodalRelationshipInput!): MultimodalRelationship!
    updateMultimodalRelationship(id: ID!, input: CreateMultimodalRelationshipInput!): MultimodalRelationship!
    verifyMultimodalRelationship(id: ID!, verified: Boolean!): MultimodalRelationship!
    
    # Processing Pipeline
    startExtractionJob(input: ExtractionJobInput!): ExtractionJob!
    cancelExtractionJob(id: ID!): Boolean!
    reprocessMedia(
      mediaSourceId: ID!
      extractionMethods: [ExtractionMethod!]!
      investigationId: ID!
    ): ExtractionJob!
    
    # Batch Operations
    batchUploadMedia(inputs: [MediaSourceInput!]!): [MediaSource!]!
    batchExtractEntities(
      mediaSourceIds: [ID!]!
      extractionMethods: [ExtractionMethod!]!
      investigationId: ID!
    ): [ExtractionJob!]!
    
    # Cross-modal Operations
    generateCrossModalMatches(entityId: ID!, targetMediaTypes: [MediaType!]!): [CrossModalMatch!]!
    computeSemanticClusters(investigationId: ID!, algorithm: String = "kmeans"): [SemanticCluster!]!
    
    # Quality and Cleanup
    validateExtractionResults(jobId: ID!): QualityMetrics!
    cleanupDuplicateEntities(
      investigationId: ID!
      similarity: Float = 0.95
      autoMerge: Boolean = false
    ): Int!
  }

  # Extended Subscription Types
  extend type Subscription {
    # Extraction Processing
    extractionJobUpdated(jobId: ID!): ExtractionJob!
    extractionJobCompleted(investigationId: ID!): ExtractionJob!
    
    # Entity Updates
    multimodalEntityAdded(investigationId: ID!): MultimodalEntity!
    multimodalEntityUpdated(investigationId: ID!): MultimodalEntity!
    multimodalEntityVerified(investigationId: ID!): MultimodalEntity!
    
    # Relationship Updates
    multimodalRelationshipAdded(investigationId: ID!): MultimodalRelationship!
    multimodalRelationshipUpdated(investigationId: ID!): MultimodalRelationship!
    
    # Cross-modal Events
    crossModalMatchFound(investigationId: ID!): CrossModalMatch!
    semanticClusterUpdated(investigationId: ID!): SemanticCluster!
  }
`;
module.exports = { multimodalTypeDefs };
//# sourceMappingURL=multimodalSchema.js.map