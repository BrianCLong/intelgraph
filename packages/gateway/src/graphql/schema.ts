import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type RawEntity {
    id: ID!
    names: [String!]!
  }

  type Query {
    rawEntities: [RawEntity!]!
  }
`;
