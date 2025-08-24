import { gql } from 'apollo-server-express';

export default gql`
  type Hypothesis {
    id: ID!
    title: String!
    prior: Float!
  }

  type Query {
    hypotheses: [Hypothesis!]!
  }

  type Mutation {
    createHypothesis(title: String!, prior: Float!): Hypothesis!
  }
`;
