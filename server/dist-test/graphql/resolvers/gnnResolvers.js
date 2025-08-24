/**
 * GraphQL resolvers for Graph Neural Network operations
 */
const GNNService = require('../../services/GNNService');
const logger = require('../../utils/logger');
const { trackGraphOperation } = require('../../monitoring/middleware');
const gnnResolvers = {
    Query: {
        /**
         * List available GNN models
         */
        gnnModels: async (_, __, { user, req }) => {
            try {
                const result = await GNNService.listModels({
                    token: req.headers.authorization?.replace('Bearer ', '')
                });
                if (!result.success) {
                    throw new Error(result.error);
                }
                return {
                    models: Object.entries(result.models).map(([name, info]) => ({
                        name,
                        ...info,
                        config: JSON.stringify(info.config || {}),
                        metrics: JSON.stringify(info.metrics || {})
                    })),
                    count: result.count
                };
            }
            catch (error) {
                logger.error('Failed to list GNN models', {
                    error: error.message,
                    userId: user?.id
                });
                throw new Error(`Failed to list GNN models: ${error.message}`);
            }
        },
        /**
         * Get information about a specific GNN model
         */
        gnnModel: async (_, { name }, { user, req }) => {
            try {
                const result = await GNNService.getModelInfo(name, {
                    token: req.headers.authorization?.replace('Bearer ', '')
                });
                if (!result.success) {
                    throw new Error(result.error);
                }
                return {
                    name,
                    ...result.modelInfo,
                    config: JSON.stringify(result.modelInfo.config || {}),
                    metrics: JSON.stringify(result.modelInfo.metrics || {})
                };
            }
            catch (error) {
                logger.error('Failed to get GNN model info', {
                    modelName: name,
                    error: error.message,
                    userId: user?.id
                });
                throw new Error(`Failed to get model info: ${error.message}`);
            }
        }
    },
    Mutation: {
        /**
         * Perform node classification using GNN
         */
        gnnNodeClassification: async (_, args, { user, req }) => {
            const { investigationId, graphData, nodeFeatures, nodeLabels, modelName, modelConfig, taskMode, options } = args.input;
            return trackGraphOperation('gnn_node_classification', investigationId, async () => {
                try {
                    // Convert graph data format
                    const convertedGraphData = GNNService.convertGraphData(graphData);
                    const result = await GNNService.classifyNodes({
                        investigationId,
                        graphData: convertedGraphData,
                        nodeFeatures: nodeFeatures ? JSON.parse(nodeFeatures) : {},
                        nodeLabels: nodeLabels ? JSON.parse(nodeLabels) : {},
                        modelName: modelName || 'default_node_classifier',
                        modelConfig: modelConfig ? JSON.parse(modelConfig) : {},
                        taskMode: taskMode || 'predict',
                        options: {
                            ...options,
                            token: req.headers.authorization?.replace('Bearer ', '')
                        }
                    });
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    logger.info('GNN node classification initiated', {
                        investigationId,
                        jobId: result.jobId,
                        taskMode: result.taskMode,
                        modelName: result.modelName,
                        userId: user?.id
                    });
                    return {
                        success: true,
                        jobId: result.jobId,
                        taskId: result.taskId,
                        message: result.message,
                        modelName: result.modelName,
                        taskMode: result.taskMode
                    };
                }
                catch (error) {
                    logger.error('GNN node classification failed', {
                        investigationId,
                        error: error.message,
                        userId: user?.id
                    });
                    throw new Error(`Node classification failed: ${error.message}`);
                }
            });
        },
        /**
         * Perform link prediction using GNN
         */
        gnnLinkPrediction: async (_, args, { user, req }) => {
            const { investigationId, graphData, nodeFeatures, candidateEdges, modelName, modelConfig, taskMode, options } = args.input;
            return trackGraphOperation('gnn_link_prediction', investigationId, async () => {
                try {
                    const convertedGraphData = GNNService.convertGraphData(graphData);
                    const result = await GNNService.predictLinks({
                        investigationId,
                        graphData: convertedGraphData,
                        nodeFeatures: nodeFeatures ? JSON.parse(nodeFeatures) : {},
                        candidateEdges: candidateEdges || [],
                        modelName: modelName || 'default_link_predictor',
                        modelConfig: modelConfig ? JSON.parse(modelConfig) : {},
                        taskMode: taskMode || 'predict',
                        options: {
                            ...options,
                            token: req.headers.authorization?.replace('Bearer ', '')
                        }
                    });
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    logger.info('GNN link prediction initiated', {
                        investigationId,
                        jobId: result.jobId,
                        taskMode: result.taskMode,
                        modelName: result.modelName,
                        candidateEdgeCount: candidateEdges?.length || 0,
                        userId: user?.id
                    });
                    return {
                        success: true,
                        jobId: result.jobId,
                        taskId: result.taskId,
                        message: result.message,
                        modelName: result.modelName,
                        taskMode: result.taskMode
                    };
                }
                catch (error) {
                    logger.error('GNN link prediction failed', {
                        investigationId,
                        error: error.message,
                        userId: user?.id
                    });
                    throw new Error(`Link prediction failed: ${error.message}`);
                }
            });
        },
        /**
         * Perform graph classification using GNN
         */
        gnnGraphClassification: async (_, args, { user, req }) => {
            const { investigationId, graphs, graphLabels, modelName, modelConfig, taskMode, options } = args.input;
            return trackGraphOperation('gnn_graph_classification', investigationId, async () => {
                try {
                    // Convert multiple graphs
                    const convertedGraphs = graphs.map(graph => GNNService.convertGraphData(graph));
                    const result = await GNNService.classifyGraphs({
                        investigationId,
                        graphs: convertedGraphs,
                        graphLabels: graphLabels || [],
                        modelName: modelName || 'default_graph_classifier',
                        modelConfig: modelConfig ? JSON.parse(modelConfig) : {},
                        taskMode: taskMode || 'predict',
                        options: {
                            ...options,
                            token: req.headers.authorization?.replace('Bearer ', '')
                        }
                    });
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    logger.info('GNN graph classification initiated', {
                        investigationId,
                        jobId: result.jobId,
                        taskMode: result.taskMode,
                        modelName: result.modelName,
                        graphCount: graphs.length,
                        userId: user?.id
                    });
                    return {
                        success: true,
                        jobId: result.jobId,
                        taskId: result.taskId,
                        message: result.message,
                        modelName: result.modelName,
                        taskMode: result.taskMode
                    };
                }
                catch (error) {
                    logger.error('GNN graph classification failed', {
                        investigationId,
                        error: error.message,
                        userId: user?.id
                    });
                    throw new Error(`Graph classification failed: ${error.message}`);
                }
            });
        },
        /**
         * Perform anomaly detection using GNN
         */
        gnnAnomalyDetection: async (_, args, { user, req }) => {
            const { investigationId, graphData, nodeFeatures, normalNodes, modelName, modelConfig, taskMode, anomalyThreshold, options } = args.input;
            return trackGraphOperation('gnn_anomaly_detection', investigationId, async () => {
                try {
                    const convertedGraphData = GNNService.convertGraphData(graphData);
                    const result = await GNNService.detectAnomalies({
                        investigationId,
                        graphData: convertedGraphData,
                        nodeFeatures: nodeFeatures ? JSON.parse(nodeFeatures) : {},
                        normalNodes: normalNodes || [],
                        modelName: modelName || 'default_anomaly_detector',
                        modelConfig: modelConfig ? JSON.parse(modelConfig) : {},
                        taskMode: taskMode || 'predict',
                        anomalyThreshold: anomalyThreshold || 0.5,
                        options: {
                            ...options,
                            token: req.headers.authorization?.replace('Bearer ', '')
                        }
                    });
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    logger.info('GNN anomaly detection initiated', {
                        investigationId,
                        jobId: result.jobId,
                        taskMode: result.taskMode,
                        modelName: result.modelName,
                        anomalyThreshold: anomalyThreshold || 0.5,
                        userId: user?.id
                    });
                    return {
                        success: true,
                        jobId: result.jobId,
                        taskId: result.taskId,
                        message: result.message,
                        modelName: result.modelName,
                        taskMode: result.taskMode
                    };
                }
                catch (error) {
                    logger.error('GNN anomaly detection failed', {
                        investigationId,
                        error: error.message,
                        userId: user?.id
                    });
                    throw new Error(`Anomaly detection failed: ${error.message}`);
                }
            });
        },
        /**
         * Generate node embeddings using GNN
         */
        gnnGenerateEmbeddings: async (_, args, { user, req }) => {
            const { investigationId, graphData, nodeFeatures, modelName, embeddingDim, options } = args.input;
            return trackGraphOperation('gnn_generate_embeddings', investigationId, async () => {
                try {
                    const convertedGraphData = GNNService.convertGraphData(graphData);
                    const result = await GNNService.generateEmbeddings({
                        investigationId,
                        graphData: convertedGraphData,
                        nodeFeatures: nodeFeatures ? JSON.parse(nodeFeatures) : {},
                        modelName: modelName || 'default_embedder',
                        embeddingDim: embeddingDim || 128,
                        options: {
                            ...options,
                            token: req.headers.authorization?.replace('Bearer ', '')
                        }
                    });
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                    logger.info('GNN embedding generation initiated', {
                        investigationId,
                        jobId: result.jobId,
                        modelName: result.modelName,
                        embeddingDim: embeddingDim || 128,
                        userId: user?.id
                    });
                    return {
                        success: true,
                        jobId: result.jobId,
                        taskId: result.taskId,
                        message: result.message,
                        modelName: result.modelName
                    };
                }
                catch (error) {
                    logger.error('GNN embedding generation failed', {
                        investigationId,
                        error: error.message,
                        userId: user?.id
                    });
                    throw new Error(`Embedding generation failed: ${error.message}`);
                }
            });
        },
        /**
         * Delete a GNN model
         */
        deleteGnnModel: async (_, { name }, { user, req }) => {
            try {
                const result = await GNNService.deleteModel(name, {
                    token: req.headers.authorization?.replace('Bearer ', '')
                });
                if (!result.success) {
                    throw new Error(result.error);
                }
                logger.info('GNN model deleted', {
                    modelName: name,
                    userId: user?.id
                });
                return {
                    success: true,
                    message: `Model ${name} deleted successfully`,
                    modelName: name
                };
            }
            catch (error) {
                logger.error('Failed to delete GNN model', {
                    modelName: name,
                    error: error.message,
                    userId: user?.id
                });
                throw new Error(`Failed to delete model: ${error.message}`);
            }
        }
    }
};
module.exports = gnnResolvers;
//# sourceMappingURL=gnnResolvers.js.map