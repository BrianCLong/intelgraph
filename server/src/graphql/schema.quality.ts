import { gql } from 'graphql-tag';
import DataQualityService from '../services/DataQualityService';

export const qualityTypeDefs = gql`
  type DQFailure {
    index: Int!
    field: String!
    reason: String!
  }
  type DQStatus {
    passRate: Float!
    failures: [DQFailure!]!
  }
  input DQRuleInput {
    field: String!
    required: Boolean
    unique: Boolean
    pattern: String
    min: Float
    max: Float
  }
  extend type Mutation {
    upsertDQRuleset(sourceId: ID!, rules: [DQRuleInput!]!): Boolean!
    reprocess(runId: ID!, scope: String): Boolean!
  }
  extend type Query {
    dqStatus(sourceId: ID!): DQStatus!
  }
`;

export const qualityResolvers = {
  Mutation: {
    upsertDQRuleset: (_: unknown, { sourceId, rules }: { sourceId: string; rules: any[] }) => {
      DataQualityService.upsertRuleset(sourceId, rules);
      return true;
    },
    reprocess: () => true,
  },
  Query: {
    dqStatus: (_: unknown, { sourceId }: { sourceId: string }) =>
      DataQualityService.getStatus(sourceId),
  },
};
