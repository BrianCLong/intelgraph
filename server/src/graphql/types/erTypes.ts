/**
 * GraphQL type definitions for Entity Resolution operations
 */
const gql = require('graphql-tag');

const erTypes = gql`
  type ERPair {
    id: ID!
    leftId: ID!
    rightId: ID!
    score: Float
    decision: String
  }

  extend type Query {
    erPair(id: ID!): ERPair
  }

  extend type Mutation {
    labelPair(id: ID!, decision: String!): ERPair
  }
`;

module.exports = erTypes;

