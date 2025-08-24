const gql = require('graphql-tag');
// AI/Analytics schema extensions for insights and search
const aiTypeDefs = gql `
  type AIRecommendation { from: ID!, to: ID!, score: Float!, reason: String }
  type AIAnomaly { entityId: ID!, anomalyScore: Float!, reason: String }

  extend type Query {
    suggestLinks(entityId: ID!, limit: Int = 5): [AIRecommendation!]!
    detectAnomalies(investigationId: ID, limit: Int = 10): [AIAnomaly!]!
    searchEntities(q: String!, filters: JSON, limit: Int = 25): [Entity!]!
    searchEntitiesHybrid(q: String!, filters: JSON, limit: Int = 25): [Entity!]!
  }

  extend type Subscription {
    aiSuggestions(entityId: ID!): [AIRecommendation!]!
  }

  extend type Mutation {
    recordAnomaly(entityId: ID!, anomalyScore: Float!, reason: String): AIAnomaly!
  }
`;
module.exports = { aiTypeDefs };
//# sourceMappingURL=schema.ai.js.map