/**
 * Core GraphQL Schema - Production persistence types
 * Replaces demo resolvers with real PostgreSQL + Neo4j backed entities
 */

import { gql } from 'graphql-tag';

export const coreTypeDefs = gql`
  scalar DateTime
  scalar JSON

  # Core entity types
  type Entity {
    id: ID!
    tenantId: String!
    kind: String!
    labels: [String!]!
    props: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    
    # Graph relationships
    relationships(direction: RelationshipDirection = BOTH, type: String, limit: Int = 100): [Relationship!]!
    relationshipCount: RelationshipCount!
    
    # Investigation context (if entity belongs to an investigation)
    investigation: Investigation
  }

  type Relationship {
    id: ID!
    tenantId: String!
    srcId: ID!
    dstId: ID!
    type: String!
    props: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    
    # Resolved entities
    source: Entity!
    destination: Entity!
  }

  type Investigation {
    id: ID!
    tenantId: String!
    name: String!
    description: String
    status: InvestigationStatus!
    props: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    
    # Statistics
    stats: InvestigationStats!
    
    # Related entities and relationships
    entities(kind: String, limit: Int = 100, offset: Int = 0): [Entity!]!
    relationships(type: String, limit: Int = 100, offset: Int = 0): [Relationship!]!
  }

  # Enums
  enum RelationshipDirection {
    INCOMING
    OUTGOING  
    BOTH
  }

  enum InvestigationStatus {
    ACTIVE
    ARCHIVED
    COMPLETED
  }

  # Helper types
  type RelationshipCount {
    incoming: Int!
    outgoing: Int!
    total: Int!
  }

  type InvestigationStats {
    entityCount: Int!
    relationshipCount: Int!
  }

  # Input types for mutations
  input EntityInput {
    tenantId: String!
    kind: String!
    labels: [String!] = []
    props: JSON = {}
    investigationId: ID
  }

  input EntityUpdateInput {
    id: ID!
    labels: [String!]
    props: JSON
  }

  input RelationshipInput {
    tenantId: String!
    srcId: ID!
    dstId: ID!
    type: String!
    props: JSON = {}
    investigationId: ID
  }

  input InvestigationInput {
    tenantId: String!
    name: String!
    description: String
    status: InvestigationStatus = ACTIVE
    props: JSON = {}
  }

  input InvestigationUpdateInput {
    id: ID!
    name: String
    description: String
    status: InvestigationStatus
    props: JSON
  }

  # Search and filter inputs
  input EntitySearchInput {
    tenantId: String!
    kind: String
    props: JSON
    investigationId: ID
    limit: Int = 100
    offset: Int = 0
  }

  input RelationshipSearchInput {
    tenantId: String!
    type: String
    srcId: ID
    dstId: ID
    investigationId: ID
    limit: Int = 100
    offset: Int = 0
  }

  # Graph traversal types
  type GraphNeighborhood {
    center: Entity!
    entities: [Entity!]!
    relationships: [Relationship!]!
    depth: Int!
  }

  input GraphTraversalInput {
    startEntityId: ID!
    tenantId: String!
    maxDepth: Int = 2
    relationshipTypes: [String!]
    entityKinds: [String!]
    limit: Int = 100
  }

  # Extended Query operations
  extend type Query {
    # Entity queries
    entity(id: ID!, tenantId: String): Entity
    entities(input: EntitySearchInput!): [Entity!]!
    
    # Relationship queries  
    relationship(id: ID!, tenantId: String): Relationship
    relationships(input: RelationshipSearchInput!): [Relationship!]!
    
    # Investigation queries
    investigation(id: ID!, tenantId: String): Investigation
    investigations(tenantId: String!, status: InvestigationStatus, limit: Int = 50, offset: Int = 0): [Investigation!]!
    
    # Graph operations
    graphNeighborhood(input: GraphTraversalInput!): GraphNeighborhood!
    
    # Search across all entity types
    searchEntities(tenantId: String!, query: String!, kinds: [String!], limit: Int = 50): [Entity!]!
  }

  # Extended Mutation operations  
  extend type Mutation {
    # Entity mutations
    createEntity(input: EntityInput!): Entity!
    updateEntity(input: EntityUpdateInput!): Entity
    deleteEntity(id: ID!, tenantId: String!): Boolean!
    
    # Relationship mutations
    createRelationship(input: RelationshipInput!): Relationship!
    deleteRelationship(id: ID!, tenantId: String!): Boolean!
    
    # Investigation mutations
    createInvestigation(input: InvestigationInput!): Investigation!
    updateInvestigation(input: InvestigationUpdateInput!): Investigation
    deleteInvestigation(id: ID!, tenantId: String!): Boolean!
    
    # Bulk operations
    createEntitiesBatch(inputs: [EntityInput!]!, tenantId: String!): [Entity!]!
    createRelationshipsBatch(inputs: [RelationshipInput!]!, tenantId: String!): [Relationship!]!
  }

  # Real-time subscriptions for graph changes
  extend type Subscription {
    entityCreated(tenantId: String!): Entity!
    entityUpdated(tenantId: String!): Entity!
    entityDeleted(tenantId: String!): ID!
    
    relationshipCreated(tenantId: String!): Relationship!
    relationshipDeleted(tenantId: String!): ID!
    
    investigationUpdated(tenantId: String!): Investigation!
  }
`;