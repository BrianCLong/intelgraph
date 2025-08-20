import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logging';
import { CacheService } from './CacheService';
import { getNeo4jDriver } from '../db/neo4j.js';
import { explanationRequestDuration } from '../monitoring/metrics.js';

/**
 * Advanced ML Service Integration
 * Connects the GraphQL API with the new Python ML service
 */

interface MLModelConfig {
  model_type: 'accelerated_gnn' | 'quantum_gnn' | 'hybrid';
  num_node_features: number;
  hidden_channels: number;
  num_classes: number;
  architecture: 'gcn' | 'sage' | 'gat';
  use_quantization?: boolean;
  quantization_bits?: 8 | 16;
  use_quantum?: boolean;
  quantum_qubits?: number;
}

interface InferenceRequest {
  model_id: string;
  node_features: number[][];
  edge_index: number[][];
  batch_indices?: number[];
}

interface TrainingRequest {
  model_id: string;
  config: MLModelConfig;
  training_config: Record<string, any>;
  dataset_path?: string;
  use_distributed?: boolean;
}

interface QuantumOptimizationRequest {
  problem_type: 'combinatorial' | 'graph_coloring' | 'tsp';
  cost_function: Record<string, any>;
  num_qubits?: number;
  num_iterations?: number;
}

export class AdvancedMLService {
  private mlServiceUrl: string;
  private cacheService: CacheService;
  private defaultTimeout: number = 30000; // 30 seconds
  
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.cacheService = new CacheService();
    logger.info('Advanced ML Service initialized', { url: this.mlServiceUrl });
  }

  /**
   * Health check for ML service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.error('ML service health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get detailed system information
   */
  async getSystemInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/system/info`, {
        timeout: this.defaultTimeout
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get ML system info', { error: error.message });
      throw new Error('ML service unavailable');
    }
  }

  /**
   * Create a new ML model
   */
  async createModel(config: MLModelConfig): Promise<string> {
    try {
      logger.info('Creating ML model', { config });
      
      const response = await axios.post(`${this.mlServiceUrl}/models`, config, {
        timeout: this.defaultTimeout,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const modelId = response.data.model_id;
      logger.info('ML model created successfully', { modelId, type: config.model_type });
      
      return modelId;
    } catch (error) {
      logger.error('Failed to create ML model', { error: error.message, config });
      throw new Error(`Failed to create ML model: ${error.message}`);
    }
  }

  /**
   * List all available models
   */
  async listModels(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/models`, {
        timeout: this.defaultTimeout
      });
      return response.data.models;
    } catch (error) {
      logger.error('Failed to list ML models', { error: error.message });
      throw new Error('Failed to retrieve ML models');
    }
  }

  /**
   * Get information about a specific model
   */
  async getModel(modelId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/models/${modelId}`, {
        timeout: this.defaultTimeout
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get ML model info', { error: error.message, modelId });
      throw new Error(`Failed to get model info: ${error.message}`);
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelId: string): Promise<void> {
    try {
      await axios.delete(`${this.mlServiceUrl}/models/${modelId}`, {
        timeout: this.defaultTimeout
      });
      logger.info('ML model deleted successfully', { modelId });
    } catch (error) {
      logger.error('Failed to delete ML model', { error: error.message, modelId });
      throw new Error(`Failed to delete model: ${error.message}`);
    }
  }

  /**
   * Train a model
   */
  async trainModel(request: TrainingRequest): Promise<string> {
    try {
      logger.info('Starting ML model training', { modelId: request.model_id });
      
      const response = await axios.post(
        `${this.mlServiceUrl}/models/${request.model_id}/train`,
        request,
        {
          timeout: 60000, // 1 minute for training initiation
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      logger.info('ML model training started', { modelId: request.model_id });
      return response.data.message;
    } catch (error) {
      logger.error('Failed to start ML model training', { 
        error: error.message, 
        modelId: request.model_id 
      });
      throw new Error(`Failed to start training: ${error.message}`);
    }
  }

  /**
   * Run inference on a model
   */
  async predict(request: InferenceRequest): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `ml_inference:${request.model_id}:${JSON.stringify(request).slice(0, 100)}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        logger.debug('Returning cached ML inference result', { modelId: request.model_id });
        return JSON.parse(cached);
      }

      logger.debug('Running ML inference', { 
        modelId: request.model_id,
        nodeCount: request.node_features.length,
        edgeCount: request.edge_index[0]?.length || 0
      });
      
      const response = await axios.post(
        `${this.mlServiceUrl}/models/${request.model_id}/predict`,
        request,
        {
          timeout: this.defaultTimeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const result = response.data;
      
      // Cache result for 5 minutes
      await this.cacheService.set(cacheKey, JSON.stringify(result), 300);
      
      logger.info('ML inference completed', { 
        modelId: request.model_id,
        inferenceTime: result.inference_time_ms,
        predictions: result.predictions.length
      });
      
      return result;
    } catch (error) {
      logger.error('ML inference failed', { 
        error: error.message, 
        modelId: request.model_id 
      });
      throw new Error(`Inference failed: ${error.message}`);
    }
  }

  /**
   * Optimize a model for deployment
   */
  async optimizeModel(
    modelId: string, 
    optimizationType: 'tensorrt' | 'torchscript' | 'quantization' = 'torchscript',
    targetPrecision: 'fp16' | 'int8' = 'fp16'
  ): Promise<string> {
    try {
      logger.info('Starting ML model optimization', { 
        modelId, 
        optimizationType, 
        targetPrecision 
      });
      
      const response = await axios.post(
        `${this.mlServiceUrl}/models/${modelId}/optimize`,
        {
          optimization_type: optimizationType,
          target_precision: targetPrecision
        },
        {
          timeout: 120000, // 2 minutes for optimization
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      logger.info('ML model optimization completed', { modelId, optimizationType });
      return response.data.message;
    } catch (error) {
      logger.error('ML model optimization failed', { 
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
  async quantumOptimize(request: QuantumOptimizationRequest): Promise<any> {
    try {
      logger.info('Starting quantum optimization', { 
        problemType: request.problem_type,
        numQubits: request.num_qubits 
      });
      
      const response = await axios.post(
        `${this.mlServiceUrl}/quantum/optimize`,
        request,
        {
          timeout: 180000, // 3 minutes for quantum optimization
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const result = response.data;
      
      logger.info('Quantum optimization completed', { 
        problemType: request.problem_type,
        finalCost: result.final_cost,
        optimalParams: result.optimal_parameters.length
      });
      
      return result;
    } catch (error) {
      logger.error('Quantum optimization failed', { 
        error: error.message, 
        problemType: request.problem_type 
      });
      throw new Error(`Quantum optimization failed: ${error.message}`);
    }
  }

  /**
   * Apply quantum feature mapping
   */
  async quantumFeatureMap(features: number[][]): Promise<any> {
    try {
      logger.debug('Applying quantum feature mapping', { 
        sampleCount: features.length,
        featureCount: features[0]?.length || 0
      });
      
      const response = await axios.post(
        `${this.mlServiceUrl}/quantum/feature_map`,
        { features },
        {
          timeout: this.defaultTimeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const result = response.data;
      
      logger.info('Quantum feature mapping completed', { 
        originalShape: result.original_shape,
        quantumShape: result.quantum_shape,
        qubitsUsed: result.num_qubits_used
      });
      
      return result;
    } catch (error) {
      logger.error('Quantum feature mapping failed', { error: error.message });
      throw new Error(`Quantum feature mapping failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive metrics
   */
  async getMetrics(): Promise<any> {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/metrics`, {
        timeout: this.defaultTimeout
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get ML metrics', { error: error.message });
      throw new Error('Failed to retrieve ML metrics');
    }
  }

  /**
   * Get model-specific metrics
   */
  async getModelMetrics(): Promise<any> {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/metrics/models`, {
        timeout: this.defaultTimeout
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get model metrics', { error: error.message });
      throw new Error('Failed to retrieve model metrics');
    }
  }

  /**
   * Enhanced graph analysis using advanced ML
   */
  async analyzeGraphWithML(
    nodeFeatures: number[][],
    edgeIndex: number[][],
    analysisType: 'anomaly_detection' | 'link_prediction' | 'node_classification' = 'node_classification'
  ): Promise<any> {
    try {
      // Create or get appropriate model
      const modelConfig: MLModelConfig = {
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
    } catch (error) {
      logger.error('Graph ML analysis failed', { error: error.message, analysisType });
      throw new Error(`Graph ML analysis failed: ${error.message}`);
    }
  }

  /**
   * Quantum-enhanced graph optimization
   */
  async optimizeGraphWithQuantum(
    graphData: any,
    optimizationType: 'graph_coloring' | 'combinatorial' = 'graph_coloring',
    numQubits: number = 8
  ): Promise<any> {
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
    } catch (error) {
      logger.error('Quantum graph optimization failed', { error: error.message });
      throw new Error(`Quantum graph optimization failed: ${error.message}`);
    }
  }

  /**
   * Request explanation or counterfactuals from Graph-XAI service
   */
  async getExplanations(
    params: {
      sourceId?: string;
      targetId?: string;
      edgeId?: string;
      target?: number;
      mode: 'why' | 'counterfactual';
    }
  ): Promise<any> {
    const traceId = uuidv4();
    const cacheKey = `explain:${params.mode}:${params.sourceId || ''}:${params.targetId || ''}:${params.edgeId || ''}:${params.target ?? ''}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return { ...JSON.parse(cached), traceId };
    }

    const start = Date.now();
    try {
      const response = await axios.post(
        `${this.mlServiceUrl}/explain`,
        params,
        {
          timeout: this.defaultTimeout,
          headers: { 'x-trace-id': traceId }
        }
      );
      const data = response.data;
      await this.cacheService.set(cacheKey, data, 900000);
      const duration = (Date.now() - start) / 1000;
      explanationRequestDuration.observe(duration);
      return { ...data, traceId };
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      explanationRequestDuration.observe(duration);
      logger.error('Graph-XAI explanation failed, falling back', { error: error.message, traceId });
      if (params.sourceId && params.targetId) {
        const fallback = await this.shortestPath(params.sourceId, params.targetId);
        return {
          paths: fallback ? [fallback] : [],
          featureAttributions: [],
          fairnessFlags: [],
          limitations: ['Graph-XAI unavailable; using shortest-path'],
          traceId
        };
      }
      throw new Error('Explanation service unavailable');
    }
  }

  private async shortestPath(source: string, target: string): Promise<any | null> {
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      const res = await session.run(
        `MATCH p=shortestPath((a:Entity {id:$src})-[*..5]-(b:Entity {id:$dst})) RETURN p`,
        { src: source, dst: target }
      );
      const record = res.records[0];
      if (!record) return null;
      const path = record.get('p');
      return {
        nodes: path.nodes().map((n: any) => n.properties.id),
        edges: path.relationships().map((r: any) => r.properties.id)
      };
    } finally {
      await session.close();
    }
  }
}

export const advancedMLService = new AdvancedMLService();