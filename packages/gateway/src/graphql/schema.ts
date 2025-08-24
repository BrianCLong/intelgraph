import { gql } from 'apollo-server-express';

const typeDefs = gql`
  type Tenant { id: ID!, name: String!, slug: String! }
  type User { id: ID!, email: String!, name: String! }
  type AuthTokens { access: String!, refresh: String! }

  type Query {
    tenants: [Tenant!]!
  }

  type Mutation {
    createTenant(name: String!, slug: String!): Tenant!
    registerUser(tenantId: ID!, email: String!, password: String!, name: String!): User!
    login(tenantId: ID!, email: String!, password: String!): AuthTokens!
  }
`;

export default typeDefs;
