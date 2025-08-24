"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedMLResolvers = void 0;
const AdvancedMLService_1 = require("../services/AdvancedMLService");
const logging_1 = require("../logging");
const policyWrapper_1 = require("./policyWrapper");
/**
 * GraphQL resolvers for advanced ML capabilities
 */
const resolvers = {
    Query: {
        /**
         * Get ML system health and information
         */
        mlSystemInfo: async () => {
            try {
                const [isHealthy, systemInfo] = await Promise.all([
                    AdvancedMLService_1.advancedMLService.healthCheck(),
                    AdvancedMLService_1.advancedMLService.getSystemInfo(),
                ]);
                return {
                    healthy: isHealthy,
                    ...systemInfo,
                    timestamp: new Date().toISOString(),
                };
            }
            catch (error) {
                logging_1.logger.error("Failed to get ML system info", { error: error.message });
                return {
                    healthy: false,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                };
            }
        },
        /**
         * List all ML models
         */
        mlModels: async () => {
            try {
                const models = await AdvancedMLService_1.advancedMLService.listModels();
                return models.map((model) => ({
                    id: model.model_id,
                    type: model.model_type,
                    status: model.status,
                    createdAt: model.created_at,
                    device: model.device,
                    memoryUsage: model.memory_usage,
                }));
            }
            catch (error) {
                logging_1.logger.error("Failed to list ML models", { error: error.message });
                throw new Error(`Failed to list ML models: ${error.message}`);
            }
        },
        /**
         * Get ML performance metrics
         */
        mlMetrics: async () => {
            try {
                const [systemMetrics, modelMetrics] = await Promise.all([
                    AdvancedMLService_1.advancedMLService.getMetrics(),
                    AdvancedMLService_1.advancedMLService.getModelMetrics(),
                ]);
                return {
                    system: systemMetrics,
                    models: modelMetrics,
                    timestamp: new Date().toISOString(),
                };
            }
            catch (error) {
                logging_1.logger.error("Failed to get ML metrics", { error: error.message });
                throw new Error(`Failed to get ML metrics: ${error.message}`);
            }
        },
    },
    Mutation: {
        /**
         * Create a new ML model
         */
        createMLModel: async (_, { input }) => {
            try {
                const modelConfig = {
                    model_type: input.modelType || "accelerated_gnn",
                    num_node_features: input.numNodeFeatures || 128,
                    hidden_channels: input.hiddenChannels || 256,
                    num_classes: input.numClasses || 10,
                    architecture: input.architecture || "gcn",
                    use_quantization: input.useQuantization || false,
                    quantization_bits: input.quantizationBits || 8,
                    use_quantum: input.useQuantum || false,
                    quantum_qubits: input.quantumQubits || 4,
                };
                const modelId = await AdvancedMLService_1.advancedMLService.createModel(modelConfig);
                return {
                    success: true,
                    modelId,
                    message: `ML model created successfully with ID: ${modelId}`,
                    config: modelConfig,
                };
            }
            catch (error) {
                logging_1.logger.error("Failed to create ML model", {
                    error: error.message,
                    input,
                });
                return {
                    success: false,
                    error: error.message,
                    modelId: null,
                };
            }
        },
        /**
         * Train an ML model
         */
        trainMLModel: async (_, { modelId, trainingConfig }) => {
            try {
                const config = {
                    batch_size: trainingConfig?.batchSize || 32,
                    learning_rate: trainingConfig?.learningRate || 0.001,
                    num_epochs: trainingConfig?.numEpochs || 100,
                    use_mixed_precision: trainingConfig?.useMixedPrecision || true,
                    use_distributed: trainingConfig?.useDistributed || false,
                };
                const message = await AdvancedMLService_1.advancedMLService.trainModel({
                    model_id: modelId,
                    config: {
                        model_type: "accelerated_gnn",
                        num_node_features: 128,
                        hidden_channels: 256,
                        num_classes: 10,
                        architecture: "gcn",
                    },
                    training_config: config,
                    use_distributed: config.use_distributed,
                });
                return {
                    success: true,
                    message,
                    modelId,
                    trainingConfig: config,
                };
            }
            catch (error) {
                logging_1.logger.error("Failed to train ML model", {
                    error: error.message,
                    modelId,
                });
                return {
                    success: false,
                    error: error.message,
                    modelId,
                };
            }
        },
        /**
         * Run ML inference on graph data
         */
        runMLInference: async (_, { modelId, graphData }) => {
            try {
                const nodeFeatures = graphData.nodeFeatures || [];
                const edgeIndex = graphData.edgeIndex || [[], []];
                const batchIndices = graphData.batchIndices;
                const result = await AdvancedMLService_1.advancedMLService.predict({
                    model_id: modelId,
                    node_features: nodeFeatures,
                    edge_index: edgeIndex,
                    batch_indices: batchIndices,
                });
                return {
                    success: true,
                    modelId,
                    predictions: result.predictions,
                    confidenceScores: result.confidence_scores,
                    inferenceTime: result.inference_time_ms,
                    device: result.device,
                };
            }
            catch (error) {
                logging_1.logger.error("ML inference failed", { error: error.message, modelId });
                return {
                    success: false,
                    error: error.message,
                    modelId,
                };
            }
        },
        /**
         * Optimize ML model for deployment
         */
        optimizeMLModel: async (_, { modelId, optimizationType, targetPrecision }) => {
            try {
                const message = await AdvancedMLService_1.advancedMLService.optimizeModel(modelId, optimizationType || "torchscript", targetPrecision || "fp16");
                return {
                    success: true,
                    message,
                    modelId,
                    optimizationType: optimizationType || "torchscript",
                    targetPrecision: targetPrecision || "fp16",
                };
            }
            catch (error) {
                logging_1.logger.error("ML model optimization failed", {
                    error: error.message,
                    modelId,
                });
                return {
                    success: false,
                    error: error.message,
                    modelId,
                };
            }
        },
        /**
         * Run quantum optimization on graph problems
         */
        runQuantumOptimization: async (_, { input }) => {
            try {
                const result = await AdvancedMLService_1.advancedMLService.quantumOptimize({
                    problem_type: input.problemType || "combinatorial",
                    cost_function: input.costFunction || {},
                    num_qubits: input.numQubits || 8,
                    num_iterations: input.numIterations || 100,
                });
                return {
                    success: true,
                    optimalParameters: result.optimal_parameters,
                    finalCost: result.final_cost,
                    numQubits: result.num_qubits,
                    numIterations: result.num_iterations,
                    problemType: input.problemType,
                };
            }
            catch (error) {
                logging_1.logger.error("Quantum optimization failed", {
                    error: error.message,
                    input,
                });
                return {
                    success: false,
                    error: error.message,
                    problemType: input.problemType,
                };
            }
        },
        /**
         * Enhanced graph analysis using advanced ML
         */
        analyzeGraphWithML: async (_, { graphId, analysisType }) => {
            try {
                // This would typically fetch graph data from Neo4j
                // For now, we'll simulate with sample data
                const nodeFeatures = Array(100)
                    .fill(0)
                    .map(() => Array(128)
                    .fill(0)
                    .map(() => Math.random()));
                const edgeIndex = [
                    Array(200)
                        .fill(0)
                        .map(() => Math.floor(Math.random() * 100)),
                    Array(200)
                        .fill(0)
                        .map(() => Math.floor(Math.random() * 100)),
                ];
                const result = await AdvancedMLService_1.advancedMLService.analyzeGraphWithML(nodeFeatures, edgeIndex, analysisType || "node_classification");
                return {
                    success: true,
                    graphId,
                    analysisType: result.analysisType,
                    predictions: result.predictions,
                    confidenceScores: result.confidence_scores,
                    inferenceTime: result.inference_time_ms,
                    modelInfo: result.model_info,
                    insights: generateInsights(result),
                };
            }
            catch (error) {
                logging_1.logger.error("Graph ML analysis failed", {
                    error: error.message,
                    graphId,
                });
                return {
                    success: false,
                    error: error.message,
                    graphId,
                };
            }
        },
        /**
         * Quantum-enhanced graph optimization
         */
        optimizeGraphWithQuantum: async (_, { graphId, optimizationType, numQubits }) => {
            try {
                // Simulate graph data - in production this would come from Neo4j
                const graphData = {
                    nodes: Array(50)
                        .fill(0)
                        .map((_, i) => ({ id: i, label: `Node${i}` })),
                    edges: Array(100)
                        .fill(0)
                        .map(() => ({
                        source: Math.floor(Math.random() * 50),
                        target: Math.floor(Math.random() * 50),
                    })),
                };
                const result = await AdvancedMLService_1.advancedMLService.optimizeGraphWithQuantum(graphData, optimizationType || "graph_coloring", numQubits || 8);
                return {
                    success: true,
                    graphId,
                    optimizationType: result.optimization_type,
                    optimalSolution: result.optimal_solution,
                    finalCost: result.final_cost,
                    quantumAdvantage: result.quantum_advantage,
                    graphInfo: result.graph_info,
                    recommendations: generateOptimizationRecommendations(result),
                };
            }
            catch (error) {
                logging_1.logger.error("Quantum graph optimization failed", {
                    error: error.message,
                    graphId,
                });
                return {
                    success: false,
                    error: error.message,
                    graphId,
                };
            }
        },
        /**
         * Delete ML model
         */
        deleteMLModel: async (_, { modelId }) => {
            try {
                await AdvancedMLService_1.advancedMLService.deleteModel(modelId);
                return {
                    success: true,
                    message: `Model ${modelId} deleted successfully`,
                    modelId,
                };
            }
            catch (error) {
                logging_1.logger.error("Failed to delete ML model", {
                    error: error.message,
                    modelId,
                });
                return {
                    success: false,
                    error: error.message,
                    modelId,
                };
            }
        },
    },
};
exports.advancedMLResolvers = (0, policyWrapper_1.wrapResolversWithPolicy)("AdvancedML", resolvers);
/**
 * Generate insights from ML analysis results
 */
function generateInsights(result) {
    const insights = [];
    if (result.confidence_scores) {
        const avgConfidence = result.confidence_scores.reduce((a, b) => a + b, 0) /
            result.confidence_scores.length;
        insights.push(`Average prediction confidence: ${(avgConfidence * 100).toFixed(1)}%`);
        if (avgConfidence > 0.9) {
            insights.push("High confidence predictions indicate strong model performance");
        }
        else if (avgConfidence < 0.7) {
            insights.push("Low confidence predictions may require model retraining");
        }
    }
    if (result.inference_time_ms) {
        if (result.inference_time_ms < 100) {
            insights.push("Fast inference time suitable for real-time applications");
        }
        else if (result.inference_time_ms > 1000) {
            insights.push("Consider model optimization for better performance");
        }
    }
    if (result.model_info?.quantized) {
        insights.push("Model uses quantization for optimized memory usage");
    }
    return insights;
}
/**
 * Generate optimization recommendations
 */
function generateOptimizationRecommendations(result) {
    const recommendations = [];
    if (result.quantum_advantage) {
        recommendations.push("Quantum optimization provides advantage for this problem size");
    }
    else {
        recommendations.push("Consider classical optimization for smaller problems");
    }
    if (result.final_cost < 0.1) {
        recommendations.push("Excellent optimization result achieved");
    }
    else if (result.final_cost > 0.5) {
        recommendations.push("Consider increasing quantum iterations for better results");
    }
    if (result.graph_info.nodes > 100) {
        recommendations.push("Large graph detected - consider distributed quantum processing");
    }
    return recommendations;
}
//# sourceMappingURL=advancedML.js.map