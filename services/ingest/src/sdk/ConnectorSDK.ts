/**
 * IntelGraph Connector SDK
 * Extensible framework for data ingestion connectors
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export interface ConnectorConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  parameters: ConnectorParameter[];
  supportedFormats: string[];
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface ConnectorParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'file' | 'password';
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface IngestRecord {
  id: string;
  type: string;
  data: Record<string, any>;
  metadata?: {
    source?: string;
    timestamp?: Date;
    confidence?: number;
    tags?: string[];
    [key: string]: any;
  };
}

export interface IngestBatch {
  records: IngestRecord[];
  batchId: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface ConnectorMetrics {
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailures: number;
  batchesProcessed: number;
  avgProcessingTime: number;
  lastRunTime?: Date;
  totalRunTime: number;
  errors: Array<{
    timestamp: Date;
    error: string;
    recordId?: string;
  }>;
}

export interface ConnectorStatus {
  status: 'idle' | 'running' | 'paused' | 'error' | 'completed';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  metrics: ConnectorMetrics;
  lastError?: string;
  startTime?: Date;
  endTime?: Date;
}

export abstract class BaseConnector extends EventEmitter {
  protected config: ConnectorConfig;
  protected parameters: Record<string, any> = {};
  protected metrics: ConnectorMetrics;
  protected status: ConnectorStatus;
  protected isRunning = false;
  protected isPaused = false;
  
  constructor(config: ConnectorConfig) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
    this.status = this.initializeStatus();
  }

  private initializeMetrics(): ConnectorMetrics {
    return {
      recordsProcessed: 0,
      recordsSuccessful: 0,
      recordsFailures: 0,
      batchesProcessed: 0,
      avgProcessingTime: 0,
      totalRunTime: 0,
      errors: []
    };
  }

  private initializeStatus(): ConnectorStatus {
    return {
      status: 'idle',
      progress: {
        current: 0,
        total: 0,
        percentage: 0
      },
      metrics: this.metrics
    };
  }

  // Abstract methods to be implemented by specific connectors
  abstract validate(parameters: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract fetchData(): AsyncGenerator<IngestRecord[], void, unknown>;
  abstract testConnection(): Promise<{ success: boolean; message?: string }>;

  // Configuration methods
  getConfig(): ConnectorConfig {
    return { ...this.config };
  }

  setParameters(parameters: Record<string, any>): void {
    this.parameters = { ...parameters };
  }

  getParameters(): Record<string, any> {
    return { ...this.parameters };
  }

  // Status and metrics
  getStatus(): ConnectorStatus {
    return {
      ...this.status,
      metrics: { ...this.metrics }
    };
  }

  getMetrics(): ConnectorMetrics {
    return { ...this.metrics };
  }

  // Main execution methods
  async run(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Connector is already running');
    }

    try {
      // Validate parameters
      const validation = await this.validate(this.parameters);
      if (!validation.valid) {
        throw new Error(`Invalid parameters: ${validation.errors?.join(', ')}`);
      }

      this.isRunning = true;
      this.isPaused = false;
      this.status.status = 'running';
      this.status.startTime = new Date();
      this.metrics.lastRunTime = this.status.startTime;

      logger.info({
        message: 'Starting connector',
        connectorId: this.config.id,
        connectorName: this.config.name
      });

      this.emit('start');

      // Connect to data source
      await this.connect();
      this.emit('connected');

      // Process data in batches
      let batchCount = 0;
      const batchSize = this.config.batchSize || 100;

      for await (const records of this.fetchData()) {
        if (!this.isRunning) break;
        
        while (this.isPaused && this.isRunning) {
          await this.sleep(1000); // Wait while paused
        }

        if (!this.isRunning) break;

        const batch: IngestBatch = {
          records,
          batchId: `${this.config.id}-${Date.now()}-${batchCount}`,
          timestamp: new Date(),
          source: this.config.name,
          metadata: {
            connectorVersion: this.config.version,
            batchNumber: batchCount
          }
        };

        await this.processBatch(batch);
        batchCount++;

        // Update progress
        this.status.progress.current += records.length;
        this.updateProgress();
      }

      this.status.status = 'completed';
      this.status.endTime = new Date();
      this.metrics.totalRunTime += this.status.endTime.getTime() - this.status.startTime!.getTime();

      logger.info({
        message: 'Connector completed successfully',
        connectorId: this.config.id,
        metrics: this.metrics
      });

      this.emit('completed', this.metrics);

    } catch (error) {
      this.handleError(error);
    } finally {
      this.isRunning = false;
      await this.disconnect().catch(err => 
        logger.error({
          message: 'Error disconnecting',
          connectorId: this.config.id,
          error: err instanceof Error ? err.message : String(err)
        })
      );
    }
  }

  private async processBatch(batch: IngestBatch): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.emit('batchStart', batch);
      
      // Process each record in the batch
      const results = await Promise.allSettled(
        batch.records.map(record => this.processRecord(record))
      );

      // Update metrics based on results
      results.forEach((result, index) => {
        this.metrics.recordsProcessed++;
        
        if (result.status === 'fulfilled') {
          this.metrics.recordsSuccessful++;
        } else {
          this.metrics.recordsFailures++;
          this.metrics.errors.push({
            timestamp: new Date(),
            error: result.reason?.message || 'Unknown error',
            recordId: batch.records[index].id
          });
        }
      });

      this.metrics.batchesProcessed++;
      
      const processingTime = Date.now() - startTime;
      this.metrics.avgProcessingTime = 
        (this.metrics.avgProcessingTime * (this.metrics.batchesProcessed - 1) + processingTime) 
        / this.metrics.batchesProcessed;

      this.emit('batchCompleted', {
        batch,
        results: results.map(r => r.status),
        processingTime
      });

      logger.debug({
        message: 'Batch processed',
        connectorId: this.config.id,
        batchId: batch.batchId,
        recordCount: batch.records.length,
        successCount: results.filter(r => r.status === 'fulfilled').length,
        processingTime
      });

    } catch (error) {
      this.emit('batchError', { batch, error });
      throw error;
    }
  }

  protected async processRecord(record: IngestRecord): Promise<void> {
    // Default implementation - emit record for processing
    // Can be overridden by specific connectors for custom processing
    this.emit('record', record);
    
    // Add processing delay to prevent overwhelming downstream systems
    if (this.config.timeout) {
      await this.sleep(this.config.timeout);
    }
  }

  // Control methods
  pause(): void {
    if (!this.isRunning) {
      throw new Error('Cannot pause - connector is not running');
    }
    this.isPaused = true;
    this.status.status = 'paused';
    this.emit('paused');
  }

  resume(): void {
    if (!this.isRunning) {
      throw new Error('Cannot resume - connector is not running');
    }
    this.isPaused = false;
    this.status.status = 'running';
    this.emit('resumed');
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.status.status = 'idle';
    this.emit('stopped');
  }

  // Utility methods
  protected updateProgress(): void {
    if (this.status.progress.total > 0) {
      this.status.progress.percentage = 
        Math.round((this.status.progress.current / this.status.progress.total) * 100);
    }
    this.emit('progress', this.status.progress);
  }

  protected handleError(error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.status.status = 'error';
    this.status.lastError = errorMessage;
    this.status.endTime = new Date();
    
    this.metrics.errors.push({
      timestamp: new Date(),
      error: errorMessage
    });

    logger.error({
      message: 'Connector error',
      connectorId: this.config.id,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    this.emit('error', error);
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Data transformation utilities
  protected createRecord(id: string, type: string, data: Record<string, any>, metadata?: Record<string, any>): IngestRecord {
    return {
      id,
      type,
      data,
      metadata: {
        source: this.config.name,
        timestamp: new Date(),
        confidence: 1.0,
        ...metadata
      }
    };
  }

  protected validateRecord(record: IngestRecord): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!record.id) errors.push('Record ID is required');
    if (!record.type) errors.push('Record type is required');
    if (!record.data || typeof record.data !== 'object') errors.push('Record data must be an object');

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // Schema mapping utilities
  protected mapFields(data: Record<string, any>, fieldMapping: Record<string, string>): Record<string, any> {
    const mapped: Record<string, any> = {};
    
    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      if (data[sourceField] !== undefined) {
        mapped[targetField] = data[sourceField];
      }
    }
    
    return mapped;
  }

  protected applyTransformations(data: Record<string, any>, transformations: Array<{
    field: string;
    transform: (value: any) => any;
  }>): Record<string, any> {
    const transformed = { ...data };
    
    for (const { field, transform } of transformations) {
      if (transformed[field] !== undefined) {
        try {
          transformed[field] = transform(transformed[field]);
        } catch (error) {
          logger.warn({
            message: 'Transformation failed',
            field,
            value: transformed[field],
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    
    return transformed;
  }
}

// Connector Registry for managing available connectors
export class ConnectorRegistry {
  private connectors = new Map<string, typeof BaseConnector>();
  private instances = new Map<string, BaseConnector>();

  register(connectorClass: typeof BaseConnector): void {
    const tempInstance = new connectorClass({} as ConnectorConfig);
    const config = tempInstance.getConfig();
    this.connectors.set(config.id, connectorClass);
  }

  getAvailableConnectors(): ConnectorConfig[] {
    const configs: ConnectorConfig[] = [];
    
    for (const ConnectorClass of this.connectors.values()) {
      const tempInstance = new ConnectorClass({} as ConnectorConfig);
      configs.push(tempInstance.getConfig());
    }
    
    return configs;
  }

  createConnector(connectorId: string, parameters: Record<string, any>): BaseConnector {
    const ConnectorClass = this.connectors.get(connectorId);
    if (!ConnectorClass) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    const tempInstance = new ConnectorClass({} as ConnectorConfig);
    const config = tempInstance.getConfig();
    
    const connector = new ConnectorClass(config);
    connector.setParameters(parameters);
    
    const instanceId = `${connectorId}-${Date.now()}`;
    this.instances.set(instanceId, connector);
    
    return connector;
  }

  getConnectorInstance(instanceId: string): BaseConnector | undefined {
    return this.instances.get(instanceId);
  }

  removeInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.stop();
      this.instances.delete(instanceId);
    }
  }
}

// Global registry instance
export const connectorRegistry = new ConnectorRegistry();