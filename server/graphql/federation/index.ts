import gql from 'graphql-tag';

export const federationTypeDefs = gql`
  type FederatedQuery {
    query: String!
  }

  type Query {
    _federationInfo: String!
  }
`;

export const federationResolvers = {
  Query: {
    _federationInfo: () => 'federation placeholder',
  },
};
