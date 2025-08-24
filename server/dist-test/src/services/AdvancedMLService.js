"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedMLService = exports.AdvancedMLService = void 0;
const axios_1 = __importDefault(require("axios"));
const logging_1 = require("../logging");
const CacheService_1 = require("./CacheService");
class AdvancedMLService {
    constructor() {
        this.defaultTimeout = 30000; // 30 seconds
        this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        this.cacheService = new CacheService_1.CacheService();
        logging_1.logger.info('Advanced ML Service initialized', { url: this.mlServiceUrl });
    }
    /**
     * Health check for ML service
     */
    async healthCheck() {
        try {
            const response = await axios_1.default.get(`${this.mlServiceUrl}/health`, {
                timeout: 5000
            });
            return response.status === 200;
        }
        catch (error) {
            logging_1.logger.error('ML service health check failed', { error: error.message });
            return false;
        }
    }
    /**
     * Get detailed system information
     */
    async getSystemInfo() {
        try {
            const response = await axios_1.default.get(`${this.mlServiceUrl}/system/info`, {
                timeout: this.defaultTimeout
            });
            return response.data;
        }
        catch (error) {
            logging_1.logger.error('Failed to get ML system info', { error: error.message });
            throw new Error('ML service unavailable');
        }
    }
    /**
     * Create a new ML model
     */
    async createModel(config) {
        try {
            logging_1.logger.info('Creating ML model', { config });
            const response = await axios_1.default.post(`${this.mlServiceUrl}/models`, config, {
                timeout: this.defaultTimeout,
                headers: { 'Content-Type': 'application/json' }
            });
            const modelId = response.data.model_id;
            logging_1.logger.info('ML model created successfully', { modelId, type: config.model_type });
            return modelId;
        }
        catch (error) {
            logging_1.logger.error('Failed to create ML model', { error: error.message, config });
            throw new Error(`Failed to create ML model: ${error.message}`);
        }
    }
    /**
     * List all available models
     */
    async listModels() {
        try {
            const response = await axios_1.default.get(`${this.mlServiceUrl}/models`, {
                timeout: this.defaultTimeout
            });
            return response.data.models;
        }
        catch (error) {
            logging_1.logger.error('Failed to list ML models', { error: error.message });
            throw new Error('Failed to retrieve ML models');
        }
    }
    /**
     * Get information about a specific model
     */
    async getModel(modelId) {
        try {
            const response = await axios_1.default.get(`${this.mlServiceUrl}/models/${modelId}`, {
                timeout: this.defaultTimeout
            });
            return response.data;
        }
        catch (error) {
            logging_1.logger.error('Failed to get ML model info', { error: error.message, modelId });
            throw new Error(`Failed to get model info: ${error.message}`);
        }
    }
    /**
     * Delete a model
     */
    async deleteModel(modelId) {
        try {
            await axios_1.default.delete(`${this.mlServiceUrl}/models/${modelId}`, {
                timeout: this.defaultTimeout
            });
            logging_1.logger.info('ML model deleted successfully', { modelId });
        }
        catch (error) {
            logging_1.logger.error('Failed to delete ML model', { error: error.message, modelId });
            throw new Error(`Failed to delete model: ${error.message}`);
        }
    }
    /**
     * Train a model
     */
    async trainModel(request) {
        try {
            logging_1.logger.info('Starting ML model training', { modelId: request.model_id });
            const response = await axios_1.default.post(`${this.mlServiceUrl}/models/${request.model_id}/train`, request, {
                timeout: 60000, // 1 minute for training initiation
                headers: { 'Content-Type': 'application/json' }
            });
            logging_1.logger.info('ML model training started', { modelId: request.model_id });
            return response.data.message;
        }
        catch (error) {
            logging_1.logger.error('Failed to start ML model training', {
                error: error.message,
                modelId: request.model_id
            });
            throw new Error(`Failed to start training: ${error.message}`);
        }
    }
    /**
     * Run inference on a model
     */
    async predict(request) {
        try {
            // Check cache first
            const cacheKey = `ml_inference:${request.model_id}:${JSON.stringify(request).slice(0, 100)}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                logging_1.logger.debug('Returning cached ML inference result', { modelId: request.model_id });
                return JSON.parse(cached);
            }
            logging_1.logger.debug('Running ML inference', {
                modelId: request.model_id,
                nodeCount: request.node_features.length,
                edgeCount: request.edge_index[0]?.length || 0
            });
            const response = await axios_1.default.post(`${this.mlServiceUrl}/models/${request.model_id}/predict`, request, {
                timeout: this.defaultTimeout,
                headers: { 'Content-Type': 'application/json' }
            });
            const result = response.data;
            // Cache result for 5 minutes
            await this.cacheService.set(cacheKey, JSON.stringify(result), 300);
            logging_1.logger.info('ML inference completed', {
                modelId: request.model_id,
                inferenceTime: result.inference_time_ms,
                predictions: result.predictions.length
            });
            return result;
        }
        catch (error) {
            logging_1.logger.error('ML inference failed', {
                error: error.message,
                modelId: request.model_id
            });
            throw new Error(`Inference failed: ${error.message}`);
        }
    }
    /**
     * Optimize a model for deployment
     */
    async optimizeModel(modelId, optimizationType = 'torchscript', targetPrecision = 'fp16') {
        try {
            logging_1.logger.info('Starting ML model optimization', {
                modelId,
                optimizationType,
                targetPrecision
            });
            const response = await axios_1.default.post(`${this.mlServiceUrl}/models/${modelId}/optimize`, {
                optimization_type: optimizationType,
                target_precision: targetPrecision
            }, {
                timeout: 120000, // 2 minutes for optimization
                headers: { 'Content-Type': 'application/json' }
            });
            logging_1.logger.info('ML model optimization completed', { modelId, optimizationType });
            return response.data.message;
        }
        catch (error) {
            logging_1.logger.error('ML model optimization failed', {
                error: error.message,
                modelId,
                optimizationType
            });
            throw new Error(`Optimization failed: ${error.message}`);
        }
    }
    /**
     * Run quantum optimization
     */
    async quantumOptimize(request) {
        try {
            logging_1.logger.info('Starting quantum optimization', {
                problemType: request.problem_type,
                numQubits: request.num_qubits
            });
            const response = await axios_1.default.post(`${this.mlServiceUrl}/quantum/optimize`, request, {
                timeout: 180000, // 3 minutes for quantum optimization
                headers: { 'Content-Type': 'application/json' }
            });
            const result = response.data;
            logging_1.logger.info('Quantum optimization completed', {
                problemType: request.problem_type,
                finalCost: result.final_cost,
                optimalParams: result.optimal_parameters.length
            });
            return result;
        }
        catch (error) {
            logging_1.logger.error('Quantum optimization failed', {
                error: error.message,
                problemType: request.problem_type
            });
            throw new Error(`Quantum optimization failed: ${error.message}`);
        }
    }
    /**
     * Apply quantum feature mapping
     */
    async quantumFeatureMap(features) {
        try {
            logging_1.logger.debug('Applying quantum feature mapping', {
                sampleCount: features.length,
                featureCount: features[0]?.length || 0
            });
            const response = await axios_1.default.post(`${this.mlServiceUrl}/quantum/feature_map`, { features }, {
                timeout: this.defaultTimeout,
                headers: { 'Content-Type': 'application/json' }
            });
            const result = response.data;
            logging_1.logger.info('Quantum feature mapping completed', {
                originalShape: result.original_shape,
                quantumShape: result.quantum_shape,
                qubitsUsed: result.num_qubits_used
            });
            return result;
        }
        catch (error) {
            logging_1.logger.error('Quantum feature mapping failed', { error: error.message });
            throw new Error(`Quantum feature mapping failed: ${error.message}`);
        }
    }
    /**
     * Get comprehensive metrics
     */
    async getMetrics() {
        try {
            const response = await axios_1.default.get(`${this.mlServiceUrl}/metrics`, {
                timeout: this.defaultTimeout
            });
            return response.data;
        }
        catch (error) {
            logging_1.logger.error('Failed to get ML metrics', { error: error.message });
            throw new Error('Failed to retrieve ML metrics');
        }
    }
    /**
     * Get model-specific metrics
     */
    async getModelMetrics() {
        try {
            const response = await axios_1.default.get(`${this.mlServiceUrl}/metrics/models`, {
                timeout: this.defaultTimeout
            });
            return response.data;
        }
        catch (error) {
            logging_1.logger.error('Failed to get model metrics', { error: error.message });
            throw new Error('Failed to retrieve model metrics');
        }
    }
    /**
     * Enhanced graph analysis using advanced ML
     */
    async analyzeGraphWithML(nodeFeatures, edgeIndex, analysisType = 'node_classification') {
        try {
            // Create or get appropriate model
            const modelConfig = {
                model_type: 'accelerated_gnn',
                num_node_features: nodeFeatures[0]?.length || 128,
                hidden_channels: 256,
                num_classes: analysisType === 'anomaly_detection' ? 2 : 10,
                architecture: 'gcn',
                use_quantization: true,
                quantization_bits: 8
            };
            const modelId = await this.createModel(modelConfig);
            // Run inference
            const result = await this.predict({
                model_id: modelId,
                node_features: nodeFeatures,
                edge_index: edgeIndex
            });
            // Clean up model (in production, you might want to cache models)
            await this.deleteModel(modelId);
            return {
                analysisType,
                predictions: result.predictions,
                confidence_scores: result.confidence_scores,
                inference_time_ms: result.inference_time_ms,
                model_info: {
                    type: modelConfig.model_type,
                    architecture: modelConfig.architecture,
                    quantized: modelConfig.use_quantization
                }
            };
        }
        catch (error) {
            logging_1.logger.error('Graph ML analysis failed', { error: error.message, analysisType });
            throw new Error(`Graph ML analysis failed: ${error.message}`);
        }
    }
    /**
     * Quantum-enhanced graph optimization
     */
    async optimizeGraphWithQuantum(graphData, optimizationType = 'graph_coloring', numQubits = 8) {
        try {
            // Extract cost function parameters from graph
            const costFunction = {
                type: optimizationType,
                graph_size: graphData.nodes?.length || 0,
                edge_count: graphData.edges?.length || 0
            };
            const result = await this.quantumOptimize({
                problem_type: optimizationType,
                cost_function: costFunction,
                num_qubits: numQubits,
                num_iterations: 100
            });
            return {
                optimization_type: optimizationType,
                optimal_solution: result.optimal_parameters,
                final_cost: result.final_cost,
                quantum_advantage: result.num_qubits > 4, // Heuristic
                graph_info: {
                    nodes: graphData.nodes?.length || 0,
                    edges: graphData.edges?.length || 0
                }
            };
        }
        catch (error) {
            logging_1.logger.error('Quantum graph optimization failed', { error: error.message });
            throw new Error(`Quantum graph optimization failed: ${error.message}`);
        }
    }
}
exports.AdvancedMLService = AdvancedMLService;
exports.advancedMLService = new AdvancedMLService();
//# sourceMappingURL=AdvancedMLService.js.map