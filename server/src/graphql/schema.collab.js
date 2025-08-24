import { gql } from 'graphql-tag';

export const collabTypeDefs = gql`
  scalar DateTime
  scalar JSON

  type Branch {
    id: ID!
    name: String!
    head: Commit
  }

  type Commit {
    id: ID!
    message: String
    createdAt: DateTime!
  }

  type ChangeSet {
    id: ID!
    branchId: ID!
    changes: JSON
  }

  type Review {
    id: ID!
    branch: Branch!
    status: String!
  }

  type Annotation {
    id: ID!
    content: String!
    authorId: ID!
    createdAt: DateTime!
  }

  type Presence {
    userId: ID!
    status: String!
  }

  extend type Query {
    branches: [Branch!]!
  }

  extend type Mutation {
    createBranch(name: String!): Branch!
  }

  extend type Subscription {
    presenceUpdated: Presence!
  }
`;
