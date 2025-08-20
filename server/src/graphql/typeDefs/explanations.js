const gql = require('graphql-tag');

const explanationTypeDefs = gql`
  type ExplanationPath {
    nodes: [ID!]!
    edges: [ID!]!
  }

  type FeatureAttribution {
    feature: String!
    importance: Float!
  }

  type Explanation {
    paths: [ExplanationPath!]!
    featureAttributions: [FeatureAttribution!]!
    fairnessFlags: [String!]
    limitations: [String!]
    traceId: ID!
  }

  type CounterfactualChange {
    edgeId: ID!
    action: String!
  }

  type Counterfactual {
    changes: [CounterfactualChange!]!
    traceId: ID!
  }

  extend type Query {
    explainConnection(sourceId: ID!, targetId: ID!): Explanation!
    counterfactualEdge(edgeId: ID!, target: Float!): Counterfactual!
  }
`;

module.exports = { explanationTypeDefs };
