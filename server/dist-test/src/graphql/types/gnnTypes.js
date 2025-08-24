/**
 * GraphQL type definitions for Graph Neural Network operations
 */
const gql = require('graphql-tag');
const gnnTypes = gql `
  # GNN Model Information
  type GNNModel {
    name: String!
    config: String!  # JSON string of model configuration
    createdAt: String!
    trained: Boolean!
    metrics: String  # JSON string of training metrics
    totalParameters: Int!
    trainableParameters: Int!
    device: String!
    modelSizeMb: Float!
  }

  # GNN Models List Response
  type GNNModelsResponse {
    models: [GNNModel!]!
    count: Int!
  }

  # GNN Task Response
  type GNNTaskResponse {
    success: Boolean!
    jobId: String!
    taskId: String!
    message: String!
    modelName: String!
    taskMode: String
  }

  # GNN Model Deletion Response
  type GNNModelDeleteResponse {
    success: Boolean!
    message: String!
    modelName: String!
  }

  # Input Types for GNN Operations
  input GNNNodeClassificationInput {
    investigationId: ID!
    graphData: JSON!  # Graph data in various formats
    nodeFeatures: String  # JSON string of node features
    nodeLabels: String   # JSON string of node labels (for training)
    modelName: String
    modelConfig: String  # JSON string of model configuration
    taskMode: String     # 'train' or 'predict'
    options: GNNOptionsInput
  }

  input GNNLinkPredictionInput {
    investigationId: ID!
    graphData: JSON!
    nodeFeatures: String
    candidateEdges: [[String!]!]  # List of edge pairs to predict
    modelName: String
    modelConfig: String
    taskMode: String
    options: GNNOptionsInput
  }

  input GNNGraphClassificationInput {
    investigationId: ID!
    graphs: [JSON!]!  # List of graphs
    graphLabels: [Int!]  # Labels for training
    modelName: String
    modelConfig: String
    taskMode: String
    options: GNNOptionsInput
  }

  input GNNAnomalyDetectionInput {
    investigationId: ID!
    graphData: JSON!
    nodeFeatures: String
    normalNodes: [String!]  # Known normal nodes for training
    modelName: String
    modelConfig: String
    taskMode: String
    anomalyThreshold: Float
    options: GNNOptionsInput
  }

  input GNNEmbeddingGenerationInput {
    investigationId: ID!
    graphData: JSON!
    nodeFeatures: String
    modelName: String
    embeddingDim: Int
    options: GNNOptionsInput
  }

  input GNNOptionsInput {
    numEpochs: Int
    batchSize: Int
    learningRate: Float
    timeout: Int
  }

  extend type Query {
    # List all available GNN models
    gnnModels: GNNModelsResponse!
    
    # Get information about a specific GNN model
    gnnModel(name: String!): GNNModel!
  }

  extend type Mutation {
    # Perform node classification using GNN
    gnnNodeClassification(input: GNNNodeClassificationInput!): GNNTaskResponse!
    
    # Perform link prediction using GNN
    gnnLinkPrediction(input: GNNLinkPredictionInput!): GNNTaskResponse!
    
    # Perform graph classification using GNN
    gnnGraphClassification(input: GNNGraphClassificationInput!): GNNTaskResponse!
    
    # Perform anomaly detection using GNN
    gnnAnomalyDetection(input: GNNAnomalyDetectionInput!): GNNTaskResponse!
    
    # Generate node embeddings using GNN
    gnnGenerateEmbeddings(input: GNNEmbeddingGenerationInput!): GNNTaskResponse!
    
    # Delete a GNN model
    deleteGnnModel(name: String!): GNNModelDeleteResponse!
  }
`;
module.exports = gnnTypes;
//# sourceMappingURL=gnnTypes.js.map