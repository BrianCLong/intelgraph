/**
 * Graph Neural Network Service for IntelGraph
 * Provides high-level interface for GNN operations
 */
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { trackGraphOperation, trackError } from '../monitoring/middleware.js';

class GNNService {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Perform node classification using GNN
   */
  async classifyNodes(params) {
    const {
      investigationId,
      graphData,
      nodeFeatures = {},
      nodeLabels = {},
      modelName = 'default_node_classifier',
      modelConfig = {},
      taskMode = 'predict',
      options = {}
    } = params;

    const jobId = uuidv4();

    return trackGraphOperation('gnn_node_classification', investigationId, async () => {
      try {
        const payload = {
          job_id: jobId,
          graph_data: graphData,
          node_features: nodeFeatures,
          node_labels: nodeLabels,
          model_name: modelName,
          model_config: {
            model_type: 'graphsage',
            hidden_dim: 256,
            output_dim: 128,
            dropout: 0.2,
            ...modelConfig
          },
          task_mode: taskMode,
          num_epochs: options.numEpochs || (taskMode === 'train' ? 50 : undefined)
        };

        const response = await fetch(`${this.mlServiceUrl}/gnn/node_classification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${options.token || ''}`
          },
          body: JSON.stringify(payload),
          timeout: this.defaultTimeout
        });

        if (!response.ok) {
          throw new Error(`GNN node classification failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        logger.info('GNN node classification initiated', {
          investigationId,
          jobId,
          taskId: result.task_id,
          taskMode,
          modelName
        });

        return {
          success: true,
          jobId,
          taskId: result.task_id,
          taskMode,
          modelName,
          message: 'Node classification task queued successfully'
        };

      } catch (error) {
        trackError('gnn_service', 'NodeClassificationError');
        logger.error('GNN node classification failed', {
          investigationId,
          jobId,
          error: error.message
        });

        return {
          success: false,
          jobId,
          error: error.message
        };
      }
    });
  }

  /**
   * Perform link prediction using GNN
   */
  async predictLinks(params) {
    const {
      investigationId,
      graphData,
      nodeFeatures = {},
      candidateEdges = [],
      modelName = 'default_link_predictor',
      modelConfig = {},
      taskMode = 'predict',
      options = {}
    } = params;

    const jobId = uuidv4();

    return trackGraphOperation('gnn_link_prediction', investigationId, async () => {
      try {
        const payload = {
          job_id: jobId,
          graph_data: graphData,
          node_features: nodeFeatures,
          candidate_edges: candidateEdges,
          model_name: modelName,
          model_config: {
            model_type: 'graphsage',
            hidden_dim: 256,
            output_dim: 128,
            dropout: 0.2,
            ...modelConfig
          },
          task_mode: taskMode,
          num_epochs: options.numEpochs || (taskMode === 'train' ? 50 : undefined),
          // hint for callback routing on ML service
          focus_entity_id: options.focusEntityId || undefined
        };

        const response = await fetch(`${this.mlServiceUrl}/gnn/link_prediction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${options.token || ''}`
          },
          body: JSON.stringify(payload),
          timeout: this.defaultTimeout
        });

        if (!response.ok) {
          throw new Error(`GNN link prediction failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        logger.info('GNN link prediction initiated', {
          investigationId,
          jobId,
          taskId: result.task_id,
          taskMode,
          modelName,
          candidateEdgeCount: candidateEdges.length
        });

        return {
          success: true,
          jobId,
          taskId: result.task_id,
          taskMode,
          modelName,
          message: 'Link prediction task queued successfully'
        };

      } catch (error) {
        trackError('gnn_service', 'LinkPredictionError');
        logger.error('GNN link prediction failed', {
          investigationId,
          jobId,
          error: error.message
        });

        return {
          success: false,
          jobId,
          error: error.message
        };
      }
    });
  }

  /**
   * Perform graph classification using GNN
   */
  async classifyGraphs(params) {
    const {
      investigationId,
      graphs,
      graphLabels = [],
      modelName = 'default_graph_classifier',
      modelConfig = {},
      taskMode = 'predict',
      options = {}
    } = params;

    const jobId = uuidv4();

    return trackGraphOperation('gnn_graph_classification', investigationId, async () => {
      try {
        const payload = {
          job_id: jobId,
          graphs: graphs,
          graph_labels: graphLabels,
          model_name: modelName,
          model_config: {
            model_type: 'gin',
            hidden_dim: 256,
            output_dim: 128,
            dropout: 0.2,
            ...modelConfig
          },
          task_mode: taskMode,
          num_epochs: options.numEpochs || (taskMode === 'train' ? 100 : undefined)
        };

        const response = await fetch(`${this.mlServiceUrl}/gnn/graph_classification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${options.token || ''}`
          },
          body: JSON.stringify(payload),
          timeout: this.defaultTimeout
        });

        if (!response.ok) {
          throw new Error(`GNN graph classification failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        logger.info('GNN graph classification initiated', {
          investigationId,
          jobId,
          taskId: result.task_id,
          taskMode,
          modelName,
          graphCount: graphs.length
        });

        return {
          success: true,
          jobId,
          taskId: result.task_id,
          taskMode,
          modelName,
          message: 'Graph classification task queued successfully'
        };

      } catch (error) {
        trackError('gnn_service', 'GraphClassificationError');
        logger.error('GNN graph classification failed', {
          investigationId,
          jobId,
          error: error.message
        });

        return {
          success: false,
          jobId,
          error: error.message
        };
      }
    });
  }

  /**
   * Perform anomaly detection using GNN
   */
  async detectAnomalies(params) {
    const {
      investigationId,
      graphData,
      nodeFeatures = {},
      normalNodes = [],
      modelName = 'default_anomaly_detector',
      modelConfig = {},
      taskMode = 'predict',
      anomalyThreshold = 0.5,
      options = {}
    } = params;

    const jobId = uuidv4();

    return trackGraphOperation('gnn_anomaly_detection', investigationId, async () => {
      try {
        const payload = {
          job_id: jobId,
          graph_data: graphData,
          node_features: nodeFeatures,
          normal_nodes: normalNodes,
          model_name: modelName,
          model_config: {
            model_type: 'gat',
            hidden_dim: 256,
            output_dim: 128,
            dropout: 0.2,
            ...modelConfig
          },
          task_mode: taskMode,
          anomaly_threshold: anomalyThreshold,
          num_epochs: options.numEpochs || (taskMode === 'train' ? 50 : undefined)
        };

        const response = await fetch(`${this.mlServiceUrl}/gnn/anomaly_detection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${options.token || ''}`
          },
          body: JSON.stringify(payload),
          timeout: this.defaultTimeout
        });

        if (!response.ok) {
          throw new Error(`GNN anomaly detection failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        logger.info('GNN anomaly detection initiated', {
          investigationId,
          jobId,
          taskId: result.task_id,
          taskMode,
          modelName,
          anomalyThreshold
        });

        return {
          success: true,
          jobId,
          taskId: result.task_id,
          taskMode,
          modelName,
          message: 'Anomaly detection task queued successfully'
        };

      } catch (error) {
        trackError('gnn_service', 'AnomalyDetectionError');
        logger.error('GNN anomaly detection failed', {
          investigationId,
          jobId,
          error: error.message
        });

        return {
          success: false,
          jobId,
          error: error.message
        };
      }
    });
  }

  /**
   * Generate node embeddings using GNN
   */
  async generateEmbeddings(params) {
    const {
      investigationId,
      graphData,
      nodeFeatures = {},
      modelName = 'default_embedder',
      embeddingDim = 128,
      options = {}
    } = params;

    const jobId = uuidv4();

    return trackGraphOperation('gnn_generate_embeddings', investigationId, async () => {
      try {
        const payload = {
          job_id: jobId,
          graph_data: graphData,
          node_features: nodeFeatures,
          model_name: modelName,
          embedding_dim: embeddingDim
        };

        const response = await fetch(`${this.mlServiceUrl}/gnn/generate_embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${options.token || ''}`
          },
          body: JSON.stringify(payload),
          timeout: this.defaultTimeout
        });

        if (!response.ok) {
          throw new Error(`GNN embedding generation failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        logger.info('GNN embedding generation initiated', {
          investigationId,
          jobId,
          taskId: result.task_id,
          modelName,
          embeddingDim
        });

        return {
          success: true,
          jobId,
          taskId: result.task_id,
          modelName,
          message: 'Embedding generation task queued successfully'
        };

      } catch (error) {
        trackError('gnn_service', 'EmbeddingGenerationError');
        logger.error('GNN embedding generation failed', {
          investigationId,
          jobId,
          error: error.message
        });

        return {
          success: false,
          jobId,
          error: error.message
        };
      }
    });
  }

  /**
   * List available GNN models
   */
  async listModels(options = {}) {
    try {
      const response = await fetch(`${this.mlServiceUrl}/gnn/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${options.token || ''}`
        },
        timeout: this.defaultTimeout
      });

      if (!response.ok) {
        throw new Error(`Failed to list GNN models: ${response.statusText}`);
      }

      const result = await response.json();
      
      logger.info('GNN models listed', {
        modelCount: result.count
      });

      return {
        success: true,
        models: result.models,
        count: result.count
      };

    } catch (error) {
      trackError('gnn_service', 'ListModelsError');
      logger.error('Failed to list GNN models', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get information about a specific GNN model
   */
  async getModelInfo(modelName, options = {}) {
    try {
      const response = await fetch(`${this.mlServiceUrl}/gnn/models/${modelName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${options.token || ''}`
        },
        timeout: this.defaultTimeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Model not found'
          };
        }
        throw new Error(`Failed to get model info: ${response.statusText}`);
      }

      const result = await response.json();
      
      logger.info('GNN model info retrieved', {
        modelName,
        modelType: result.config?.model_type,
        taskType: result.config?.task_type
      });

      return {
        success: true,
        modelInfo: result
      };

    } catch (error) {
      trackError('gnn_service', 'GetModelInfoError');
      logger.error('Failed to get GNN model info', {
        modelName,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a GNN model
   */
  async deleteModel(modelName, options = {}) {
    try {
      const response = await fetch(`${this.mlServiceUrl}/gnn/models/${modelName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${options.token || ''}`
        },
        timeout: this.defaultTimeout
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'Model not found'
          };
        }
        throw new Error(`Failed to delete model: ${response.statusText}`);
      }

      const result = await response.json();
      
      logger.info('GNN model deleted', {
        modelName
      });

      return {
        success: true,
        deleted: result.deleted,
        modelName: result.model_name
      };

    } catch (error) {
      trackError('gnn_service', 'DeleteModelError');
      logger.error('Failed to delete GNN model', {
        modelName,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert graph data from various formats to GNN-compatible format
   */
  convertGraphData(graphData, format = 'auto') {
    try {
      if (format === 'auto') {
        // Auto-detect format
        if (Array.isArray(graphData)) {
          // Edge list format
          return { edges: graphData };
        } else if (graphData.nodes && graphData.edges) {
          // Node-edge format
          return {
            edges: graphData.edges.map(e => [e.source || e.from, e.target || e.to]),
            node_features: this._extractNodeFeatures(graphData.nodes)
          };
        } else if (graphData.edges) {
          // Simple edge format
          return graphData;
        }
      }

      return graphData;
    } catch (error) {
      logger.error('Failed to convert graph data', {
        error: error.message,
        format
      });
      throw new Error(`Graph data conversion failed: ${error.message}`);
    }
  }

  /**
   * Extract node features from node data
   */
  _extractNodeFeatures(nodes) {
    const nodeFeatures = {};
    
    for (const node of nodes) {
      const features = [];
      
      // Extract numeric properties as features
      for (const [key, value] of Object.entries(node)) {
        if (key !== 'id' && typeof value === 'number') {
          features.push(value);
        }
      }
      
      // If no numeric features, create default features
      if (features.length === 0) {
        features.push(1.0); // Default feature
      }
      
      nodeFeatures[node.id] = features;
    }
    
    return nodeFeatures;
  }

  /**
   * Health check for GNN service connectivity
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.mlServiceUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });

      return {
        available: response.ok,
        status: response.status,
        message: response.ok ? 'GNN service available' : 'GNN service unavailable'
      };
    } catch (error) {
      return {
        available: false,
        status: 0,
        message: `GNN service unreachable: ${error.message}`
      };
    }
  }
}

export default new GNNService();
