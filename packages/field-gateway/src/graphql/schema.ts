export const typeDefs = `#graphql
  type Device { id: ID!, name: String! }
  type EnrollmentTicket { code: String!, expiresAt: String! }
  type Query { meDevice: Device }
  type Mutation {
    createEnrollmentTicket(tenantId: ID!): EnrollmentTicket!
    enrollDevice(code: String!, devicePubKey: String!, deviceInfo: String!): String!
  }
`;
