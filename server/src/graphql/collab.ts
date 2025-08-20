import { gql } from 'apollo-server-express';
import { getCasePresence, Presence } from '../realtime/presence';

export const collabTypeDefs = gql`
  type CasePresence {
    tenantId: String!
    caseId: String!
    userId: ID!
    role: String!
    selections: [ID!]!
    lastSeen: Float!
  }

  extend type Query {
    casePresence(caseId: ID!): [CasePresence!]!
  }
`;

interface CasePresenceArgs {
  caseId: string;
}

export const collabResolvers = {
  Query: {
    casePresence: (
      _parent: unknown,
      { caseId }: CasePresenceArgs,
      context: { tenantId: string }
    ): Presence[] => {
      const tenantId = context?.tenantId || 'default';
      return getCasePresence(tenantId, caseId);
    },
  },
};

export default { collabTypeDefs, collabResolvers };
