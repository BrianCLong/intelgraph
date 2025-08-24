// src/graphql/schema.annotations.js
const gql = require('graphql-tag');
const annotationsTypeDefs = gql `
  enum Enclave {
    US_ONLY
    FIVE_EYES
    NATO
    NGO
    UNCLASSIFIED
  }

  enum Confidence {
    HIGH
    MEDIUM
    LOW
    UNKNOWN
  }

  type Annotation {
    id: ID!
    content: String!
    confidence: Confidence
    createdAt: String!
    updatedAt: String!
    createdBy: String!
    enclave: Enclave!
    # history: [AnnotationHistory!] # To be implemented later if needed for detailed history
  }

  input AnnotationInput {
    content: String!
    confidence: Confidence
    enclave: Enclave!
  }

  input UpdateAnnotationInput {
    content: String
    confidence: Confidence
    enclave: Enclave
  }

  type Edge { # Define the Edge type here
    id: ID!
    source: ID!
    target: ID!
    type: String!
    label: String
    annotations: [Annotation!] # Add annotations field to Edge
  }

  extend type Entity {
    annotations: [Annotation!]
  }

  extend type Mutation {
    createEntityAnnotation(entityId: ID!, input: AnnotationInput!): Annotation!
    createEdgeAnnotation(edgeId: ID!, input: AnnotationInput!): Annotation!
    updateAnnotation(id: ID!, input: UpdateAnnotationInput!): Annotation!
    deleteAnnotation(id: ID!): Boolean!
  }
`;
module.exports = { annotationsTypeDefs };
//# sourceMappingURL=schema.annotations.js.map