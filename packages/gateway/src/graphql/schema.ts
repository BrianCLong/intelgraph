import gql from 'graphql-tag';

export const typeDefs = gql`
  type Person {
    id: ID!
    name: String!
  }

  type Query {
    node(id: ID!): Person
  }

  type Mutation {
    upsertPerson(id: ID!, name: String!): Person!
  }
`;
