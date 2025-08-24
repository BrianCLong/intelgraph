import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { config } from '../config';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export interface TrainingExample {
  entity1: any;
  entity2: any;
  isMatch: boolean;
  confidence: number;
  features?: Record<string, number>;
  userId?: string;
  timestamp: Date;
}

export interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
  };
  totalExamples: number;
  trainingTime: number;
}

export interface ModelVersion {
  id: string;
  version: string;
  modelType: string;
  metrics: TrainingMetrics;
  isActive: boolean;
  createdAt: Date;
  modelPath: string;
  hyperparameters: Record<string, any>;
}

export class TrainingPipeline {
  private pgPool: Pool;
  private modelsDir: string;

  constructor(pgPool: Pool) {
    this.pgPool = pgPool;
    this.modelsDir = path.join(process.cwd(), 'models');
    this.ensureModelsDirectory();
  }

  private async ensureModelsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.modelsDir, { recursive: true });
      await fs.mkdir(path.join(this.modelsDir, 'entity-resolution'), { recursive: true });
      await fs.mkdir(path.join(this.modelsDir, 'training-data'), { recursive: true });
    } catch (error) {
      logger.error('Failed to create models directory:', error);
    }
  }

  async collectTrainingData(minExamples: number = 100): Promise<TrainingExample[]> {
    const query = `
      SELECT 
        er.entity1_id,
        er.entity2_id,
        er.is_match,
        er.confidence,
        er.user_id,
        er.created_at,
        e1.data as entity1_data,
        e2.data as entity2_data
      FROM entity_resolution_feedback er
      JOIN entities e1 ON e1.id = er.entity1_id
      JOIN entities e2 ON e2.id = er.entity2_id
      WHERE er.created_at >= NOW() - INTERVAL '${config.ml.entityResolution.trainingDataRetentionDays} days'
      ORDER BY er.created_at DESC
      LIMIT $1
    `;

    try {
      const result = await this.pgPool.query(query, [minExamples * 2]); // Get more to ensure variety
      
      const examples: TrainingExample[] = result.rows.map(row => ({
        entity1: row.entity1_data,
        entity2: row.entity2_data,
        isMatch: row.is_match,
        confidence: row.confidence,
        userId: row.user_id,
        timestamp: row.created_at
      }));

      logger.info(`Collected ${examples.length} training examples`);
      
      if (examples.length < minExamples) {
        logger.warn(`Only ${examples.length} examples available, minimum required: ${minExamples}`);
      }

      return examples;
    } catch (error) {
      logger.error('Error collecting training data:', error);
      throw error;
    }
  }

  async generateFeatures(examples: TrainingExample[]): Promise<TrainingExample[]> {
    logger.info('Generating features for training examples');
    
    // Feature extraction using Python script
    const pythonScript = path.join(config.ml.python.scriptPath, 'feature_extraction.py');
    const inputFile = path.join(this.modelsDir, 'training-data', 'input.json');
    const outputFile = path.join(this.modelsDir, 'training-data', 'features.json');

    try {
      // Write examples to input file
      await fs.writeFile(inputFile, JSON.stringify(examples, null, 2));

      // Run Python feature extraction
      await this.runPythonScript(pythonScript, [inputFile, outputFile]);

      // Read generated features
      const featuresData = await fs.readFile(outputFile, 'utf-8');
      const featuredExamples = JSON.parse(featuresData);

      logger.info(`Generated features for ${featuredExamples.length} examples`);
      return featuredExamples;

    } catch (error) {
      logger.error('Error generating features:', error);
      throw error;
    }
  }

  async trainModel(
    examples: TrainingExample[],
    modelType: string = 'random_forest',
    hyperparameters: Record<string, any> = {}
  ): Promise<ModelVersion> {
    logger.info(`Starting training with ${examples.length} examples`);
    
    const modelId = `er-${modelType}-${Date.now()}`;
    const modelVersion = '1.0.0';
    const modelPath = path.join(this.modelsDir, 'entity-resolution', `${modelId}.pkl`);
    
    const startTime = Date.now();

    try {
      // Generate features if not already present
      const featuredExamples = examples.every(e => e.features) 
        ? examples 
        : await this.generateFeatures(examples);

      // Prepare training data
      const trainingData = {
        examples: featuredExamples,
        modelType,
        hyperparameters: {
          n_estimators: 100,
          max_depth: 10,
          random_state: 42,
          ...hyperparameters
        },
        outputPath: modelPath
      };

      const trainingFile = path.join(this.modelsDir, 'training-data', `training-${modelId}.json`);
      await fs.writeFile(trainingFile, JSON.stringify(trainingData, null, 2));

      // Train model using Python script
      const pythonScript = path.join(config.ml.python.scriptPath, 'train_model.py');
      const metricsFile = path.join(this.modelsDir, 'training-data', `metrics-${modelId}.json`);
      
      await this.runPythonScript(pythonScript, [trainingFile, metricsFile]);

      // Read training metrics
      const metricsData = await fs.readFile(metricsFile, 'utf-8');
      const metrics: TrainingMetrics = JSON.parse(metricsData);
      metrics.trainingTime = Date.now() - startTime;

      // Create model version record
      const modelVersion: ModelVersion = {
        id: modelId,
        version: modelVersion,
        modelType,
        metrics,
        isActive: false, // Will be activated if meets criteria
        createdAt: new Date(),
        modelPath,
        hyperparameters: trainingData.hyperparameters
      };

      // Save model version to database
      await this.saveModelVersion(modelVersion);

      logger.info(`Training completed for model ${modelId}:`, {
        accuracy: metrics.accuracy,
        f1Score: metrics.f1Score,
        trainingTime: metrics.trainingTime
      });

      // Auto-activate if meets criteria
      if (await this.shouldActivateModel(modelVersion)) {
        await this.activateModel(modelId);
        logger.info(`Model ${modelId} automatically activated`);
      }

      return modelVersion;

    } catch (error) {
      logger.error('Error during model training:', error);
      throw error;
    }
  }

  async evaluateModel(modelId: string, testExamples: TrainingExample[]): Promise<TrainingMetrics> {
    logger.info(`Evaluating model ${modelId} with ${testExamples.length} test examples`);

    try {
      const modelVersion = await this.getModelVersion(modelId);
      if (!modelVersion) {
        throw new Error(`Model ${modelId} not found`);
      }

      const testData = {
        examples: testExamples,
        modelPath: modelVersion.modelPath
      };

      const testFile = path.join(this.modelsDir, 'training-data', `test-${modelId}.json`);
      const metricsFile = path.join(this.modelsDir, 'training-data', `eval-metrics-${modelId}.json`);

      await fs.writeFile(testFile, JSON.stringify(testData, null, 2));

      // Evaluate using Python script
      const pythonScript = path.join(config.ml.python.scriptPath, 'evaluate_model.py');
      await this.runPythonScript(pythonScript, [testFile, metricsFile]);

      // Read evaluation metrics
      const metricsData = await fs.readFile(metricsFile, 'utf-8');
      const metrics: TrainingMetrics = JSON.parse(metricsData);

      logger.info(`Evaluation completed for model ${modelId}:`, metrics);
      return metrics;

    } catch (error) {
      logger.error('Error evaluating model:', error);
      throw error;
    }
  }

  private async runPythonScript(scriptPath: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(config.ml.python.pythonExecutable, [scriptPath, ...args], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          if (stdout.trim()) {
            logger.info('Python script output:', stdout.trim());
          }
          resolve();
        } else {
          logger.error(`Python script failed with code ${code}:`, stderr);
          reject(new Error(`Python script failed: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        logger.error('Failed to start Python script:', error);
        reject(error);
      });
    });
  }

  private async saveModelVersion(modelVersion: ModelVersion): Promise<void> {
    const query = `
      INSERT INTO ml_model_versions (
        id, version, model_type, metrics, is_active, created_at, 
        model_path, hyperparameters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await this.pgPool.query(query, [
      modelVersion.id,
      modelVersion.version,
      modelVersion.modelType,
      JSON.stringify(modelVersion.metrics),
      modelVersion.isActive,
      modelVersion.createdAt,
      modelVersion.modelPath,
      JSON.stringify(modelVersion.hyperparameters)
    ]);
  }

  private async getModelVersion(modelId: string): Promise<ModelVersion | null> {
    const query = `
      SELECT * FROM ml_model_versions 
      WHERE id = $1
    `;

    const result = await this.pgPool.query(query, [modelId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      version: row.version,
      modelType: row.model_type,
      metrics: row.metrics,
      isActive: row.is_active,
      createdAt: row.created_at,
      modelPath: row.model_path,
      hyperparameters: row.hyperparameters
    };
  }

  private async shouldActivateModel(modelVersion: ModelVersion): Promise<boolean> {
    // Get current active model metrics
    const activeModel = await this.getActiveModel(modelVersion.modelType);
    
    if (!activeModel) {
      // No active model, activate if meets minimum criteria
      return modelVersion.metrics.f1Score >= 0.7 && modelVersion.metrics.accuracy >= 0.75;
    }

    // Compare with active model
    const improvement = modelVersion.metrics.f1Score - activeModel.metrics.f1Score;
    return improvement >= 0.02; // 2% improvement threshold
  }

  private async getActiveModel(modelType: string): Promise<ModelVersion | null> {
    const query = `
      SELECT * FROM ml_model_versions 
      WHERE model_type = $1 AND is_active = true
    `;

    const result = await this.pgPool.query(query, [modelType]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      version: row.version,
      modelType: row.model_type,
      metrics: row.metrics,
      isActive: row.is_active,
      createdAt: row.created_at,
      modelPath: row.model_path,
      hyperparameters: row.hyperparameters
    };
  }

  async activateModel(modelId: string): Promise<void> {
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get model to activate
      const modelVersion = await this.getModelVersion(modelId);
      if (!modelVersion) {
        throw new Error(`Model ${modelId} not found`);
      }

      // Deactivate current active model of same type
      await client.query(
        'UPDATE ml_model_versions SET is_active = false WHERE model_type = $1 AND is_active = true',
        [modelVersion.modelType]
      );

      // Activate new model
      await client.query(
        'UPDATE ml_model_versions SET is_active = true WHERE id = $1',
        [modelId]
      );

      await client.query('COMMIT');
      
      logger.info(`Activated model ${modelId} for type ${modelVersion.modelType}`);

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error activating model:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getModelHistory(modelType?: string, limit: number = 10): Promise<ModelVersion[]> {
    let query = `
      SELECT * FROM ml_model_versions 
    `;
    const params: any[] = [];

    if (modelType) {
      query += ' WHERE model_type = $1';
      params.push(modelType);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await this.pgPool.query(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      version: row.version,
      modelType: row.model_type,
      metrics: row.metrics,
      isActive: row.is_active,
      createdAt: row.created_at,
      modelPath: row.model_path,
      hyperparameters: row.hyperparameters
    }));
  }

  async scheduleTraining(cron: string, modelType: string): Promise<void> {
    // This would integrate with a job scheduler like Bull or Agenda
    logger.info(`Scheduled training for ${modelType} with cron: ${cron}`);
    // Implementation would depend on chosen job scheduler
  }
}