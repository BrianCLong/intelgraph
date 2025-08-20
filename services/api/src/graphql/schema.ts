/**
 * IntelGraph GraphQL Schema Definition
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # Core Entity Types
  type Entity {
    id: ID!
    type: EntityType!
    name: String!
    description: String
    properties: JSON
    confidence: Float!
    createdAt: DateTime!
    updatedAt: DateTime!
    validFrom: DateTime
    validTo: DateTime
    tenantId: String!
    
    # Provenance tracking
    sources: [Source!]!
    createdBy: User!
    
    # Relationships
    outgoingRelationships: [Relationship!]!
    incomingRelationships: [Relationship!]!
    
    # Analytics
    centrality: CentralityMetrics
    clustering: ClusteringMetrics
  }

  enum EntityType {
    PERSON
    ORGANIZATION
    LOCATION
    EVENT
    DOCUMENT
    IP_ADDRESS
    DOMAIN
    EMAIL
    PHONE
    VEHICLE
    ACCOUNT
    CUSTOM
  }

  type Relationship {
    id: ID!
    type: RelationshipType!
    source: Entity!
    target: Entity!
    properties: JSON
    confidence: Float!
    createdAt: DateTime!
    updatedAt: DateTime!
    validFrom: DateTime
    validTo: DateTime
    tenantId: String!
    
    # Provenance
    sources: [Source!]!
    createdBy: User!
  }

  enum RelationshipType {
    CONNECTED_TO
    OWNS
    WORKS_FOR
    LOCATED_AT
    PARTICIPATED_IN
    COMMUNICATES_WITH
    RELATED_TO
    CUSTOM
  }

  # Provenance and Sources
  type Source {
    id: ID!
    name: String!
    type: SourceType!
    url: String
    metadata: JSON
    reliability: Float!
    createdAt: DateTime!
    tenantId: String!
  }

  enum SourceType {
    DOCUMENT
    DATABASE
    API
    MANUAL_ENTRY
    INFERENCE
    EXTERNAL_FEED
  }

  # Analytics Types
  type CentralityMetrics {
    betweenness: Float
    closeness: Float
    degree: Int
    eigenvector: Float
    pagerank: Float
  }

  type ClusteringMetrics {
    coefficient: Float
    community: String
    modularity: Float
  }

  # Investigation Management
  type Investigation {
    id: ID!
    name: String!
    description: String
    status: InvestigationStatus!
    priority: Priority!
    createdAt: DateTime!
    updatedAt: DateTime!
    dueDate: DateTime
    tenantId: String!
    
    # Team and access
    assignedTo: [User!]!
    createdBy: User!
    
    # Content
    entities: [Entity!]!
    relationships: [Relationship!]!
    hypotheses: [Hypothesis!]!
    timeline: [TimelineEvent!]!
    
    # Analytics
    summary: InvestigationSummary
  }

  enum InvestigationStatus {
    DRAFT
    ACTIVE
    ON_HOLD
    COMPLETED
    ARCHIVED
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  type Hypothesis {
    id: ID!
    title: String!
    description: String!
    confidence: Float!
    status: HypothesisStatus!
    evidence: [Entity!]!
    createdAt: DateTime!
    createdBy: User!
    investigation: Investigation!
  }

  enum HypothesisStatus {
    PROPOSED
    INVESTIGATING
    SUPPORTED
    REFUTED
    INCONCLUSIVE
  }

  type TimelineEvent {
    id: ID!
    timestamp: DateTime!
    title: String!
    description: String
    entities: [Entity!]!
    source: Source
    investigation: Investigation!
  }

  type InvestigationSummary {
    entityCount: Int!
    relationshipCount: Int!
    timelineLength: Int!
    keyFindings: [String!]!
    riskScore: Float
  }

  # User Management
  type User {
    id: ID!
    email: String!
    name: String!
    role: Role!
    permissions: [Permission!]!
    tenantId: String!
    createdAt: DateTime!
    lastActiveAt: DateTime
  }

  enum Role {
    ANALYST
    INVESTIGATOR
    SUPERVISOR
    ADMIN
    VIEWER
  }

  type Permission {
    resource: String!
    actions: [String!]!
  }

  # AI Copilot Types
  type CopilotQuery {
    id: ID!
    naturalLanguage: String!
    generatedQuery: String!
    queryType: QueryType!
    preview: JSON
    confidence: Float!
    explanation: String
  }

  enum QueryType {
    CYPHER
    SQL
    ANALYTICS
  }

  type CopilotResponse {
    answer: String!
    sources: [Source!]!
    citations: [Citation!]!
    confidence: Float!
    followUpQuestions: [String!]!
  }

  type Citation {
    text: String!
    source: Source!
    relevance: Float!
  }

  # Search and Filtering
  input EntityFilter {
    types: [EntityType!]
    confidence: FloatRange
    dateRange: DateRange
    properties: JSON
    tenantId: String
  }

  input RelationshipFilter {
    types: [RelationshipType!]
    confidence: FloatRange
    dateRange: DateRange
    tenantId: String
  }

  input FloatRange {
    min: Float
    max: Float
  }

  input DateRange {
    start: DateTime
    end: DateTime
  }

  # Analytics Inputs
  input PathfindingInput {
    sourceId: ID!
    targetId: ID!
    algorithm: PathfindingAlgorithm!
    maxDepth: Int = 6
    relationshipTypes: [RelationshipType!]
  }

  enum PathfindingAlgorithm {
    SHORTEST_PATH
    ALL_SIMPLE_PATHS
    DIJKSTRA
    A_STAR
  }

  type PathfindingResult {
    paths: [Path!]!
    executionTime: Float!
    totalPaths: Int!
  }

  type Path {
    nodes: [Entity!]!
    relationships: [Relationship!]!
    length: Int!
    score: Float
  }

  # Mutations
  input CreateEntityInput {
    type: EntityType!
    name: String!
    description: String
    properties: JSON
    confidence: Float = 1.0
    sourceIds: [ID!]!
  }

  input UpdateEntityInput {
    name: String
    description: String
    properties: JSON
    confidence: Float
  }

  input CreateRelationshipInput {
    type: RelationshipType!
    sourceId: ID!
    targetId: ID!
    properties: JSON
    confidence: Float = 1.0
    sourceIds: [ID!]!
  }

  input CreateInvestigationInput {
    name: String!
    description: String
    priority: Priority = MEDIUM
    dueDate: DateTime
    assignedTo: [ID!]
  }

  # Queries
  type Query {
    # Entity queries
    entity(id: ID!): Entity
    entities(filter: EntityFilter, limit: Int = 50, offset: Int = 0): [Entity!]!
    searchEntities(query: String!, filter: EntityFilter): [Entity!]!
    
    # Relationship queries
    relationship(id: ID!): Relationship
    relationships(filter: RelationshipFilter, limit: Int = 50, offset: Int = 0): [Relationship!]!
    
    # Investigation queries
    investigation(id: ID!): Investigation
    investigations(status: InvestigationStatus, limit: Int = 20): [Investigation!]!
    
    # Analytics queries
    findPaths(input: PathfindingInput!): PathfindingResult!
    communityDetection(entityIds: [ID!], algorithm: String = "louvain"): JSON!
    centralityAnalysis(entityIds: [ID!]): [Entity!]!
    temporalAnalysis(entityIds: [ID!], timeWindow: String!): JSON!
    
    # AI Copilot queries
    generateQuery(naturalLanguage: String!): CopilotQuery!
    askCopilot(question: String!, context: [ID!]): CopilotResponse!
    
    # Search
    globalSearch(query: String!, types: [String!]): JSON!
  }

  # Mutations
  type Mutation {
    # Entity mutations
    createEntity(input: CreateEntityInput!): Entity!
    updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
    mergeEntities(sourceId: ID!, targetId: ID!): Entity!
    
    # Relationship mutations
    createRelationship(input: CreateRelationshipInput!): Relationship!
    updateRelationship(id: ID!, properties: JSON, confidence: Float): Relationship!
    deleteRelationship(id: ID!): Boolean!
    
    # Investigation mutations
    createInvestigation(input: CreateInvestigationInput!): Investigation!
    updateInvestigation(id: ID!, name: String, description: String, status: InvestigationStatus): Investigation!
    deleteInvestigation(id: ID!): Boolean!
    addEntityToInvestigation(investigationId: ID!, entityId: ID!): Investigation!
    
    # Hypothesis mutations
    createHypothesis(investigationId: ID!, title: String!, description: String!): Hypothesis!
    updateHypothesis(id: ID!, confidence: Float, status: HypothesisStatus): Hypothesis!
    
    # Bulk operations
    bulkCreateEntities(entities: [CreateEntityInput!]!): [Entity!]!
    bulkDeleteEntities(ids: [ID!]!): Int!
  }

  # Subscriptions for real-time updates
  type Subscription {
    entityUpdated(investigationId: ID): Entity!
    relationshipUpdated(investigationId: ID): Relationship!
    investigationUpdated(id: ID!): Investigation!
    analysisCompleted(jobId: ID!): JSON!
  }
`;