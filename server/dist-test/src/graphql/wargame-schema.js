"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_express_1 = require("apollo-server-express");
const wargameSchema = (0, apollo_server_express_1.gql) `
  # Input for defining a crisis scenario
  input CrisisScenarioInput {
    crisisType: String!
    targetAudiences: [String!]!
    keyNarratives: [String!]!
    adversaryProfiles: [String!]!
    # Additional parameters for simulation
    simulationParameters: JSON
  }

  # Represents a crisis scenario
  type CrisisScenario {
    id: ID!
    crisisType: String!
    targetAudiences: [String!]!
    keyNarratives: [String!]!
    adversaryProfiles: [String!]!
    simulationParameters: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Social media telemetry data
  type SocialMediaTelemetry {
    id: ID!
    scenarioId: ID!
    platform: String!
    postId: String!
    content: String!
    author: String
    timestamp: DateTime!
    sentiment: Float
    viralityScore: Float
    volume: Int
    narrativeDetected: String
    # Modeled on JP 3-13 IRC integration for PSYOP responses
    # Ethics Compliance: Data is simulated and anonymized for training purposes.
  }

  # Estimated adversary intent
  type AdversaryIntentEstimate {
    id: ID!
    scenarioId: ID!
    adversaryProfile: String!
    estimatedIntent: String! # e.g., "Disinformation Escalation"
    likelihood: Float! # Probability (0-1)
    reasoning: String! # Explainable reasoning from LLM
    timestamp: DateTime!
    # Ethics Compliance: Estimates are hypothetical and for simulation only.
  }

  # Data for narrative heatmap visualization
  type NarrativeHeatmapData {
    id: ID!
    scenarioId: ID!
    narrative: String!
    intensity: Float! # e.g., propagation score
    location: JSON # Geographic or network coordinates
    timestamp: DateTime!
    # Ethics Compliance: Visualizations are based on simulated data.
  }

  # Strategic response playbook based on IO doctrine
  type StrategicResponsePlaybook {
    id: ID!
    scenarioId: ID!
    name: String!
    doctrineReference: String! # e.g., "JP 3-13 Chapter IV: Planning"
    description: String!
    steps: [String!]!
    metricsOfEffectiveness: [String!]! # MOEs
    metricsOfPerformance: [String!]! # MOPs
    # Modeled on 2023 DoD Strategy for Operations in the Information Environment (SOIE) lines of effort
    # Ethics Compliance: Playbooks are theoretical and for training/simulation.
  }

  extend type Query {
    # Retrieve social media telemetry for a given scenario
    getCrisisTelemetry(scenarioId: ID!, limit: Int, offset: Int): [SocialMediaTelemetry!]!
    # Retrieve adversary intent estimates for a given scenario
    getAdversaryIntentEstimates(scenarioId: ID!): [AdversaryIntentEstimate!]!
    # Retrieve narrative heatmap data for a given scenario
    getNarrativeHeatmapData(scenarioId: ID!): [NarrativeHeatmapData!]!
    # Retrieve strategic response playbooks for a given scenario
    getStrategicResponsePlaybooks(scenarioId: ID!): [StrategicResponsePlaybook!]!
    # Get a specific crisis scenario by ID
    getCrisisScenario(id: ID!): CrisisScenario
    # Get all crisisScenarios
    getAllCrisisScenarios: [CrisisScenario!]!
  }

  extend type Mutation {
    # Run a war-gamed simulation based on crisis scenario parameters
    runWarGameSimulation(input: CrisisScenarioInput!): CrisisScenario!
    # Update a crisis scenario
    updateCrisisScenario(id: ID!, input: CrisisScenarioInput!): CrisisScenario!
    # Delete a crisis scenario
    deleteCrisisScenario(id: ID!): Boolean
  }
`;
exports.default = wargameSchema;
//# sourceMappingURL=wargame-schema.js.map