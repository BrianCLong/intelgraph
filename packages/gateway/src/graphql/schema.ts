import { gql } from 'apollo-server-express';

export default gql`
  type Graph {
    id: ID!
    name: String!
  }

  type Query {
    graphs: [Graph!]!
  }

  type Mutation {
    registerGraph(name: String!): Graph!
  }
`;
