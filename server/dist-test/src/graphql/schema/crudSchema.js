"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crudTypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.crudTypeDefs = (0, graphql_tag_1.gql) `
  scalar DateTime
  scalar JSON

  # Core entity types
  enum EntityType {
    PERSON
    ORGANIZATION
    LOCATION
    DEVICE
    EMAIL
    PHONE
    IP_ADDRESS
    DOMAIN
    URL
    FILE
    DOCUMENT
    ACCOUNT
    TRANSACTION
    EVENT
    OTHER
  }

  enum RelationshipType {
    CONNECTED_TO
    OWNS
    WORKS_FOR
    LOCATED_AT
    MENTIONS
    COMMUNICATES_WITH
    TRANSACTED_WITH
    ACCESSED
    CREATED
    MODIFIED
    RELATED_TO
    MEMBER_OF
    MANAGES
    REPORTS_TO
    SUBSIDIARY_OF
    PARTNER_OF
    COMPETITOR_OF
    SIMILAR_TO
  }

  enum UserRole {
    ADMIN
    ANALYST
    VIEWER
    LEAD
    INVESTIGATOR
  }

  enum InvestigationStatus {
    DRAFT
    ACTIVE
    PAUSED
    COMPLETED
    ARCHIVED
    CANCELLED
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  # Base Entity type
  type Entity {
    id: ID!
    type: EntityType!
    label: String!
    description: String
    properties: JSON
    customMetadata: JSON
    confidence: Float
    source: String
    investigationId: ID!
    createdBy: ID!
    updatedBy: ID
    createdAt: DateTime!
    updatedAt: DateTime!
    # Entity deduplication
    canonicalId: ID
    # TTP Correlation (Beta)
    attack_ttps: [String!]
    capec_ttps: [String!]
    triage_score: Float
    actor_links: [String!]
    # Relationships
    relationships: [Relationship!]!
    inboundRelationships: [Relationship!]!
    outboundRelationships: [Relationship!]!
  }

  # Relationship type
  type Relationship {
    id: ID!
    type: RelationshipType!
    label: String
    description: String
    properties: JSON
    customMetadata: JSON
    confidence: Float
    source: String
    fromEntityId: ID!
    toEntityId: ID!
    fromEntity: Entity!
    toEntity: Entity!
    investigationId: ID!
    createdBy: ID!
    updatedBy: ID
    since: DateTime
    until: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    # TTP Correlation (Beta)
    attack_ttps: [String!]
    capec_ttps: [String!]
  }

  # User type
  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    isActive: Boolean!
    lastLogin: DateTime
    preferences: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    # Related entities
    createdEntities: [Entity!]!
    createdRelationships: [Relationship!]!
    investigations: [Investigation!]!
  }

  # Investigation type
  type Investigation {
    id: ID!
    title: String!
    description: String
    status: InvestigationStatus!
    priority: Priority!
    tags: [String!]!
    metadata: JSON
    customSchema: JSON
    entityCount: Int!
    relationshipCount: Int!
    createdBy: User!
    updatedBy: User
    assignedTo: [User!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    # Graph data
    entities: [Entity!]!
    relationships: [Relationship!]!
  }

  # Pagination
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
    totalCount: Int!
  }

  # Entity connection for pagination
  type EntityConnection {
    edges: [EntityEdge!]!
    pageInfo: PageInfo!
  }

  type EntityEdge {
    node: Entity!
    cursor: String!
  }

  # Relationship connection for pagination
  type RelationshipConnection {
    edges: [RelationshipEdge!]!
    pageInfo: PageInfo!
  }

  type RelationshipEdge {
    node: Relationship!
    cursor: String!
  }

  # Investigation connection for pagination
  type InvestigationConnection {
    edges: [InvestigationEdge!]!
    pageInfo: PageInfo!
  }

  type InvestigationEdge {
    node: Investigation!
    cursor: String!
  }

  # Input types
  input ProvenanceInput {
    originService: String!
    ingestedAt: DateTime!
    transformationLog: [String!]!
  }

  input EntityInput {
    type: EntityType!
    label: String!
    description: String
    properties: JSON
    customMetadata: JSON
    provenance: ProvenanceInput
    confidence: Float
    source: String
    investigationId: ID!
    canonicalId: ID
  }

  input EntityUpdateInput {
    label: String
    description: String
    properties: JSON
    customMetadata: JSON
    provenance: ProvenanceInput
    confidence: Float
    source: String
    canonicalId: ID
  }

  input RelationshipInput {
    type: RelationshipType!
    label: String
    description: String
    properties: JSON
    customMetadata: JSON
    provenance: ProvenanceInput
    confidence: Float
    source: String
    fromEntityId: ID!
    toEntityId: ID!
    investigationId: ID!
    since: DateTime
    until: DateTime
  }

  input RelationshipUpdateInput {
    label: String
    description: String
    properties: JSON
    customMetadata: JSON
    provenance: ProvenanceInput
    confidence: Float
    source: String
    since: DateTime
    until: DateTime
  }

  input InvestigationInput {
    title: String!
    description: String
    priority: Priority = MEDIUM
    tags: [String!] = []
    metadata: JSON
    customSchema: JSON
  }

  input InvestigationUpdateInput {
    title: String
    description: String
    status: InvestigationStatus
    priority: Priority
    tags: [String!]
    metadata: JSON
    customSchema: JSON
  }

  # Filter inputs
  input EntityFilter {
    type: EntityType
    search: String
    investigationId: ID
    createdBy: ID
    confidence: Float
    source: String
  }

  input RelationshipFilter {
    type: RelationshipType
    search: String
    investigationId: ID
    createdBy: ID
    confidence: Float
    source: String
    fromEntityId: ID
    toEntityId: ID
  }

  input InvestigationFilter {
    status: InvestigationStatus
    priority: Priority
    search: String
    tags: [String!]
    assignedTo: ID
    createdBy: ID
  }

  input GraphDataFilter {
    minConfidence: Float
    tags: [String!]
    startDate: DateTime
    endDate: DateTime
  }

  # Core Queries
  type Query {
    # Entity queries
    entity(id: ID!): Entity
    entities(
      filter: EntityFilter
      first: Int = 25
      after: String
      orderBy: String = "createdAt"
      orderDirection: String = "DESC"
    ): EntityConnection!

    # Relationship queries
    relationship(id: ID!): Relationship
    relationships(
      filter: RelationshipFilter
      first: Int = 25
      after: String
      orderBy: String = "createdAt"
      orderDirection: String = "DESC"
    ): RelationshipConnection!

    # Investigation queries
    investigation(id: ID!): Investigation
    investigations(
      filter: InvestigationFilter
      first: Int = 25
      after: String
      orderBy: String = "createdAt"
      orderDirection: String = "DESC"
    ): InvestigationConnection!

    # Graph data for investigation
    graphData(investigationId: ID!, filter: GraphDataFilter): GraphData!

    # Related entities query
    relatedEntities(entityId: ID!): [RelatedEntity!]!

    # Current user
    me: User
  }

  type RelatedEntity {
    entity: Entity!
    strength: Float!
    relationshipType: String!
  }

  # Graph data type for visualization
  type GraphData {
    nodes: [Entity!]!
    edges: [Relationship!]!
    nodeCount: Int!
    edgeCount: Int!
  }

  # Core Mutations
  type Mutation {
    # Entity mutations
    createEntity(input: EntityInput!): Entity!
    createEntities(inputs: [EntityInput!]!): [Entity!]!
    updateEntity(
      id: ID!
      input: EntityUpdateInput!
      lastSeenTimestamp: DateTime!
    ): Entity!
    deleteEntity(id: ID!): Boolean!

    # Relationship mutations
    createRelationship(input: RelationshipInput!): Relationship!
    createRelationships(inputs: [RelationshipInput!]!): [Relationship!]!
    updateRelationship(
      id: ID!
      input: RelationshipUpdateInput!
      lastSeenTimestamp: DateTime!
    ): Relationship!
    deleteRelationship(id: ID!): Boolean!

    # Investigation mutations
    createInvestigation(input: InvestigationInput!): Investigation!
    updateInvestigation(
      id: ID!
      input: InvestigationUpdateInput!
    ): Investigation!
    deleteInvestigation(id: ID!): Boolean!
    assignUserToInvestigation(investigationId: ID!, userId: ID!): Investigation!
    unassignUserFromInvestigation(
      investigationId: ID!
      userId: ID!
    ): Investigation!

    # Authentication mutations (placeholder - handled separately)
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    refreshToken: AuthPayload!
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  # Subscriptions for real-time updates
  type Subscription {
    # Entity subscriptions
    entityCreated(investigationId: ID): Entity!
    entityUpdated(investigationId: ID): Entity!
    entityDeleted(investigationId: ID): ID!

    # Relationship subscriptions
    relationshipCreated(investigationId: ID): Relationship!
    relationshipUpdated(investigationId: ID): Relationship!
    relationshipDeleted(investigationId: ID): ID!

    # Investigation subscriptions
    investigationUpdated(investigationId: ID): Investigation!

    # Graph changes
    graphUpdated(investigationId: ID!): GraphData!
  }
`;
//# sourceMappingURL=crudSchema.js.map