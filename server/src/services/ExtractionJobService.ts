import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import IORedis from 'ioredis';
import { ProcessingStatus } from './MultimodalDataService.js';
import { ExtractionEngine } from '../ai/ExtractionEngine.js';
import OCREngine from '../ai/engines/OCREngine.js';
import ObjectDetectionEngine from '../ai/engines/ObjectDetectionEngine.js';
import SpeechToTextEngine from '../ai/engines/SpeechToTextEngine.js';
import FaceDetectionEngine from '../ai/engines/FaceDetectionEngine.js';
import TextAnalysisEngine from '../ai/engines/TextAnalysisEngine.js';
import EmbeddingService from '../ai/services/EmbeddingService.js';
import path from 'path';

const logger = logger.child({ name: 'ExtractionJobService' });

export interface ExtractionJob {
  id: string;
  investigationId: string;
  mediaSourceId: string;
  extractionMethods: string[];
  jobOptions: Record<string, any>;
  status: ProcessingStatus;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  entitiesExtracted: number;
  errors: string[];
  processingMetrics: Record<string, any>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractionJobInput {
  investigationId: string;
  mediaSourceId: string;
  extractionMethods: string[];
  options?: Record<string, any>;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  metrics: ExtractionMetrics;
  errors: string[];
}

export interface ExtractedEntity {
  entityType: string;
  extractedText?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  };
  temporalRange?: {
    startTime: number;
    endTime: number;
    confidence: number;
  };
  confidence: number;
  extractionMethod: string;
  extractionVersion: string;
  metadata: Record<string, any>;
}

export interface ExtractionMetrics {
  processingTime: number;
  entitiesExtracted: number;
  confidenceDistribution: ConfidenceDistribution[];
  methodPerformance: MethodPerformance[];
}

export interface ConfidenceDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface MethodPerformance {
  method: string;
  executionTime: number;
  entitiesFound: number;
  averageConfidence: number;
}

export class ExtractionJobService {
  private db: Pool;
  private redis: IORedis;
  private extractionQueue: Queue;
  private extractionWorker: Worker;
  private queueEvents: QueueEvents;
  private extractionEngine: ExtractionEngine;
  private ocrEngine: OCREngine;
  private objectDetectionEngine: ObjectDetectionEngine;
  private speechToTextEngine: SpeechToTextEngine;
  private faceDetectionEngine: FaceDetectionEngine;
  private textAnalysisEngine: TextAnalysisEngine;
  private embeddingService: EmbeddingService;

  constructor(db: Pool, redisConfig: any) {
    this.db = db;
    this.redis = new IORedis(redisConfig);
    
    // Initialize AI engines
    const engineConfig = {
      pythonPath: process.env.AI_PYTHON_PATH || 'python3',
      modelsPath: process.env.AI_MODELS_PATH || 'src/ai/models',
      tempPath: process.env.AI_TEMP_PATH || '/tmp/intelgraph',
      enableGPU: process.env.AI_ENABLE_GPU === 'true',
      maxConcurrentJobs: parseInt(process.env.AI_MAX_CONCURRENT_JOBS || '5'),
      batchSize: parseInt(process.env.AI_BATCH_SIZE || '32')
    };
    
    this.extractionEngine = new ExtractionEngine(engineConfig);
    this.ocrEngine = new OCREngine(engineConfig);
    this.objectDetectionEngine = new ObjectDetectionEngine(engineConfig);
    this.speechToTextEngine = new SpeechToTextEngine(engineConfig);
    this.faceDetectionEngine = new FaceDetectionEngine(engineConfig);
    this.textAnalysisEngine = new TextAnalysisEngine(engineConfig);
    this.embeddingService = new EmbeddingService(engineConfig, db);
    
    // Initialize BullMQ queue for extraction jobs
    this.extractionQueue = new Queue('multimodal-extraction', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
        attempts: 3,           // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    });

    // Initialize worker for processing extraction jobs
    this.extractionWorker = new Worker(
      'multimodal-extraction',
      this.processExtractionJob.bind(this),
      {
        connection: this.redis,
        concurrency: 5, // Process up to 5 jobs concurrently
        limiter: {
          max: 10,      // Maximum 10 jobs
          duration: 60000 // per minute
        }
      }
    );

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents('multimodal-extraction', {
      connection: this.redis
    });

    this.setupEventListeners();
  }

  /**
   * Start a new extraction job
   */
  async startExtractionJob(
    input: ExtractionJobInput,
    userId?: string
  ): Promise<ExtractionJob> {
    const jobId = uuidv4();
    const now = new Date();

    try {
      // Create job record in database
      const query = `
        INSERT INTO extraction_jobs (
          id, investigation_id, media_source_id, extraction_methods, job_options,
          status, progress, entities_extracted, errors, processing_metrics,
          created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *
      `;

      const values = [
        jobId,
        input.investigationId,
        input.mediaSourceId,
        input.extractionMethods,
        JSON.stringify(input.options || {}),
        ProcessingStatus.PENDING,
        0.0,
        0,
        [],
        JSON.stringify({}),
        userId,
        now,
        now
      ];

      const result = await this.db.query(query, values);
      const job = this.mapRowToExtractionJob(result.rows[0]);

      // Add job to BullMQ queue
      await this.extractionQueue.add(
        'extract-entities',
        {
          jobId,
          investigationId: input.investigationId,
          mediaSourceId: input.mediaSourceId,
          extractionMethods: input.extractionMethods,
          options: input.options || {}
        },
        {
          jobId, // Use our UUID as Bull job ID
          priority: this.calculateJobPriority(input.extractionMethods),
          delay: 0,
          attempts: 3
        }
      );

      logger.info(`Started extraction job: ${jobId}, methods: ${input.extractionMethods.join(', ')}`);
      return job;

    } catch (error) {
      logger.error(`Failed to start extraction job:`, error);
      throw error;
    }
  }

  /**
   * Get extraction job by ID
   */
  async getExtractionJob(id: string): Promise<ExtractionJob | null> {
    try {
      const query = 'SELECT * FROM extraction_jobs WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      return result.rows.length > 0 ? this.mapRowToExtractionJob(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to get extraction job ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get extraction jobs for investigation
   */
  async getExtractionJobs(
    investigationId: string,
    filters: {
      status?: ProcessingStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ExtractionJob[]> {
    try {
      let query = 'SELECT * FROM extraction_jobs WHERE investigation_id = $1';
      const values: any[] = [investigationId];
      let paramCount = 1;

      if (filters.status) {
        query += ` AND status = $${++paramCount}`;
        values.push(filters.status);
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        values.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${++paramCount}`;
        values.push(filters.offset);
      }

      const result = await this.db.query(query, values);
      return result.rows.map(row => this.mapRowToExtractionJob(row));

    } catch (error) {
      logger.error(`Failed to get extraction jobs for investigation ${investigationId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel extraction job
   */
  async cancelExtractionJob(id: string): Promise<ExtractionJob> {
    try {
      // Remove from queue if still pending
      const bullJob = await this.extractionQueue.getJob(id);
      if (bullJob && await bullJob.isWaiting()) {
        await bullJob.remove();
      }

      // Update database status
      const query = `
        UPDATE extraction_jobs 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND status IN ($3, $4)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        ProcessingStatus.CANCELLED,
        id,
        ProcessingStatus.PENDING,
        ProcessingStatus.IN_PROGRESS
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Extraction job ${id} not found or cannot be cancelled`);
      }

      logger.info(`Cancelled extraction job: ${id}`);
      return this.mapRowToExtractionJob(result.rows[0]);

    } catch (error) {
      logger.error(`Failed to cancel extraction job ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retry failed extraction job
   */
  async retryExtractionJob(id: string): Promise<ExtractionJob> {
    try {
      const job = await this.getExtractionJob(id);
      if (!job) {
        throw new Error(`Extraction job ${id} not found`);
      }

      if (job.status !== ProcessingStatus.FAILED) {
        throw new Error(`Extraction job ${id} is not in failed state`);
      }

      // Reset job status and clear errors
      const query = `
        UPDATE extraction_jobs 
        SET status = $1, progress = 0, errors = '{}', updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await this.db.query(query, [ProcessingStatus.PENDING, id]);

      // Re-add to queue
      await this.extractionQueue.add(
        'extract-entities',
        {
          jobId: id,
          investigationId: job.investigationId,
          mediaSourceId: job.mediaSourceId,
          extractionMethods: job.extractionMethods,
          options: job.jobOptions
        },
        {
          jobId: id,
          priority: this.calculateJobPriority(job.extractionMethods)
        }
      );

      logger.info(`Retried extraction job: ${id}`);
      return this.mapRowToExtractionJob(result.rows[0]);

    } catch (error) {
      logger.error(`Failed to retry extraction job ${id}:`, error);
      throw error;
    }
  }

  /**
   * Process extraction job (worker function)
   */
  private async processExtractionJob(job: Job): Promise<void> {
    const { jobId, investigationId, mediaSourceId, extractionMethods, options } = job.data;
    const startTime = Date.now();

    logger.info(`Processing extraction job: ${jobId}, methods: ${extractionMethods.join(', ')}`);

    try {
      // Update job status to IN_PROGRESS
      await this.updateJobStatus(jobId, ProcessingStatus.IN_PROGRESS, 0, new Date());

      // Get media source information
      const mediaSource = await this.getMediaSourceInfo(mediaSourceId);
      if (!mediaSource) {
        throw new Error(`Media source ${mediaSourceId} not found`);
      }

      // Process each extraction method
      const allResults: ExtractedEntity[] = [];
      const allErrors: string[] = [];
      const methodMetrics: MethodPerformance[] = [];

      for (let i = 0; i < extractionMethods.length; i++) {
        const method = extractionMethods[i];
        const methodStartTime = Date.now();

        try {
          // Update progress
          const progress = (i / extractionMethods.length) * 0.8; // Reserve 20% for final processing
          await this.updateJobProgress(jobId, progress);

          // Perform extraction based on method
          const result = await this.performExtraction(method, mediaSource, options);
          allResults.push(...result.entities);

          // Record method performance
          const methodDuration = Date.now() - methodStartTime;
          methodMetrics.push({
            method,
            executionTime: methodDuration,
            entitiesFound: result.entities.length,
            averageConfidence: result.entities.reduce((sum, e) => sum + e.confidence, 0) / result.entities.length || 0
          });

          logger.info(`Completed extraction method ${method}: ${result.entities.length} entities, ${methodDuration}ms`);

        } catch (methodError) {
          const errorMsg = `Failed extraction method ${method}: ${methodError.message}`;
          allErrors.push(errorMsg);
          logger.warn(errorMsg);
        }
      }

      // Save extracted entities to database
      await this.updateJobProgress(jobId, 0.9);
      const savedCount = await this.saveExtractedEntities(investigationId, mediaSourceId, allResults);

      // Calculate final metrics
      const totalDuration = Date.now() - startTime;
      const confidenceDistribution = this.calculateConfidenceDistribution(allResults);
      
      const metrics: ExtractionMetrics = {
        processingTime: totalDuration,
        entitiesExtracted: savedCount,
        confidenceDistribution,
        methodPerformance: methodMetrics
      };

      // Update job as completed
      await this.updateJobStatus(
        jobId,
        ProcessingStatus.COMPLETED,
        1.0,
        new Date(),
        new Date(),
        totalDuration,
        savedCount,
        allErrors,
        metrics
      );

      logger.info(`Completed extraction job: ${jobId}, extracted: ${savedCount} entities, duration: ${totalDuration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || 'Unknown error';

      await this.updateJobStatus(
        jobId,
        ProcessingStatus.FAILED,
        undefined,
        undefined,
        new Date(),
        duration,
        0,
        [errorMsg]
      );

      logger.error(`Failed extraction job ${jobId}:`, error);
      throw error; // Re-throw for BullMQ retry handling
    }
  }

  /**
   * Perform extraction using specified method with real AI engines
   */
  private async performExtraction(
    method: string,
    mediaSource: any,
    options: any
  ): Promise<{ entities: ExtractedEntity[]; metrics: any }> {
    const entities: ExtractedEntity[] = [];
    const startTime = Date.now();
    
    try {
      switch (method) {
        case 'ocr':
          if (mediaSource.media_type === 'IMAGE' || mediaSource.media_type === 'DOCUMENT') {
            const ocrResults = await this.runOCRExtraction(mediaSource.file_path, options);
            entities.push(...ocrResults);
          }
          break;
          
        case 'object_detection':
          if (mediaSource.media_type === 'IMAGE' || mediaSource.media_type === 'VIDEO') {
            const detectionResults = await this.runObjectDetection(mediaSource.file_path, options);
            entities.push(...detectionResults);
          }
          break;
          
        case 'face_detection':
          if (mediaSource.media_type === 'IMAGE' || mediaSource.media_type === 'VIDEO') {
            const faceResults = await this.runFaceDetection(mediaSource.file_path, options);
            entities.push(...faceResults);
          }
          break;
          
        case 'speech_to_text':
          if (mediaSource.media_type === 'AUDIO' || mediaSource.media_type === 'VIDEO') {
            const speechResults = await this.runSpeechToText(mediaSource.file_path, options);
            entities.push(...speechResults);
          }
          break;
          
        case 'text_analysis':
          if (mediaSource.extracted_text) {
            const textResults = await this.runTextAnalysis(mediaSource.extracted_text, options);
            entities.push(...textResults);
          }
          break;
          
        case 'embedding_generation':
          const embeddingResults = await this.runEmbeddingGeneration(mediaSource, options);
          entities.push(...embeddingResults);
          break;

        case 'object_detection':
          if (mediaSource.media_type === 'IMAGE' || mediaSource.media_type === 'VIDEO') {
            const detectionResults = await this.runObjectDetection(mediaSource.file_path, options);
            entities.push(...detectionResults);
          }
          break;

        case 'speech_to_text':
          if (mediaSource.media_type === 'AUDIO' || mediaSource.media_type === 'VIDEO') {
            const transcriptionResults = await this.runSpeechToText(mediaSource.file_path, options);
            entities.push(...transcriptionResults);
          }
          break;

        case 'face_detection':
          if (mediaSource.media_type === 'IMAGE' || mediaSource.media_type === 'VIDEO') {
            const faceResults = await this.runFaceDetection(mediaSource.file_path, options);
            entities.push(...faceResults);
          }
          break;

        case 'text_analysis':
          if (mediaSource.media_type === 'TEXT' || mediaSource.media_type === 'DOCUMENT') {
            const textResults = await this.runTextAnalysis(mediaSource.file_path, options);
            entities.push(...textResults);
          }
          break;

        default:
          throw new Error(`Unknown extraction method: ${method}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        entities,
        metrics: {
          method,
          processingTime,
          entitiesFound: entities.length,
          averageConfidence: entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length || 0
        }
      };
    } catch (error) {
      logger.error(`Extraction method ${method} failed:`, error);
      throw error;
    }
  }

  /**
   * Run OCR extraction using OCREngine
   */
  private async runOCRExtraction(filePath: string, options: any): Promise<ExtractedEntity[]> {
    try {
      const ocrOptions = {
        language: options.language || 'eng',
        enhanceImage: options.enhanceImage !== false,
        confidenceThreshold: options.confidenceThreshold || 0.6,
        preserveWhitespace: options.preserveWhitespace || false,
        enableStructureAnalysis: options.enableStructureAnalysis !== false
      };

      const results = await this.ocrEngine.extractText(filePath, ocrOptions);
      const entities: ExtractedEntity[] = [];

      for (const result of results) {
        entities.push({
          entityType: 'text',
          extractedText: result.text,
          boundingBox: {
            x: result.boundingBox.x,
            y: result.boundingBox.y,
            width: result.boundingBox.width,
            height: result.boundingBox.height,
            confidence: result.boundingBox.confidence
          },
          confidence: result.confidence,
          extractionMethod: 'ocr',
          extractionVersion: '2.0.0',
          metadata: {
            language: result.language,
            ocrEngine: result.engine,
            wordCount: result.text.split(' ').length,
            structureType: result.metadata?.structureType,
            readingOrder: result.metadata?.readingOrder
          }
        });
      }

      return entities;
    } catch (error) {
      logger.error('OCR extraction failed:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Run object detection using ObjectDetectionEngine
   */
  private async runObjectDetection(filePath: string, options: any): Promise<ExtractedEntity[]> {
    try {
      const detectionOptions = {
        model: options.model || 'yolov8n.pt',
        confidenceThreshold: options.confidenceThreshold || 0.5,
        nmsThreshold: options.nmsThreshold || 0.4,
        enableTracking: options.enableTracking || false,
        targetClasses: options.targetClasses || []
      };

      const results = await this.objectDetectionEngine.detectObjects(filePath, detectionOptions);
      const entities: ExtractedEntity[] = [];

      for (const detection of results) {
        entities.push({
          entityType: detection.class_name,
          boundingBox: {
            x: detection.bbox.x,
            y: detection.bbox.y,
            width: detection.bbox.width,
            height: detection.bbox.height,
            confidence: detection.confidence
          },
          confidence: detection.confidence,
          extractionMethod: 'object_detection',
          extractionVersion: '2.0.0',
          metadata: {
            model: detection.model,
            classId: detection.class_id,
            area: detection.bbox.width * detection.bbox.height,
            trackingId: detection.tracking_id
          }
        });
      }

      return entities;
    } catch (error) {
      logger.error('Object detection failed:', error);
      throw new Error(`Object detection failed: ${error.message}`);
    }
  }

  /**
   * Run speech-to-text using Python script
   */
  private async runSpeechToText(filePath: string, options: any): Promise<ExtractedEntity[]> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const pythonScript = path.join(__dirname, '../ai/models/whisper_transcription.py');
      
      const args = [
        pythonScript,
        '--audio', filePath,
        '--model', options.model || 'base',
        '--output-format', 'json'
      ];

      if (options.language && options.language !== 'auto') {
        args.push('--language', options.language);
      }

      if (options.enableWordTimestamps) {
        args.push('--word-timestamps');
      }

      const python = spawn('python3', args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            const entities: ExtractedEntity[] = [];
            
            for (const segment of result.segments || []) {
              entities.push({
                entityType: 'speech',
                extractedText: segment.text,
                temporalRange: {
                  startTime: segment.start,
                  endTime: segment.end,
                  confidence: segment.confidence
                },
                confidence: segment.confidence,
                extractionMethod: 'speech_to_text',
                extractionVersion: '2.0.0',
                metadata: {
                  language: result.language || 'unknown',
                  model: 'whisper',
                  wordCount: segment.text.split(' ').length,
                  words: segment.words || []
                }
              });
            }
            
            resolve(entities);
          } catch (parseError) {
            reject(new Error(`Failed to parse speech-to-text results: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Speech-to-text failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to run speech-to-text: ${error.message}`));
      });
    });
  }

  /**
   * Run face detection using Python script
   */
  private async runFaceDetection(filePath: string, options: any): Promise<ExtractedEntity[]> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const pythonScript = path.join(__dirname, '../ai/models/mtcnn_detection.py');
      
      const args = [
        pythonScript,
        '--image', filePath,
        '--min-face-size', (options.minFaceSize || 20).toString(),
        '--confidence', (options.confidenceThreshold || 0.7).toString()
      ];

      const python = spawn('python3', args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            const entities: ExtractedEntity[] = [];
            
            for (const face of result.faces || []) {
              entities.push({
                entityType: 'face',
                boundingBox: {
                  x: face.bbox[0],
                  y: face.bbox[1],
                  width: face.bbox[2],
                  height: face.bbox[3],
                  confidence: face.confidence
                },
                confidence: face.confidence,
                extractionMethod: 'face_detection',
                extractionVersion: '2.0.0',
                metadata: {
                  landmarks: face.landmarks || {},
                  age: face.estimated_age,
                  gender: face.estimated_gender,
                  emotion: face.dominant_emotion,
                  model: 'mtcnn'
                }
              });
            }
            
            resolve(entities);
          } catch (parseError) {
            reject(new Error(`Failed to parse face detection results: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Face detection failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to run face detection: ${error.message}`));
      });
    });
  }

  /**
   * Run text analysis using Python script
   */
  private async runTextAnalysis(filePath: string, options: any): Promise<ExtractedEntity[]> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const pythonScript = path.join(__dirname, '../ai/models/named_entity_recognition.py');
      
      // Read text file content
      const fs = require('fs');
      let textContent = '';
      
      try {
        textContent = fs.readFileSync(filePath, 'utf8');
      } catch (error) {
        reject(new Error(`Failed to read text file: ${error.message}`));
        return;
      }

      const args = [
        pythonScript,
        '--text', textContent,
        '--language', options.language || 'en'
      ];

      const python = spawn('python3', args);
      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            const entities: ExtractedEntity[] = [];
            
            // Add named entities
            for (const entity of result.entities || []) {
              entities.push({
                entityType: entity.label.toLowerCase(),
                extractedText: entity.text,
                confidence: entity.confidence,
                extractionMethod: 'text_analysis',
                extractionVersion: '2.0.0',
                metadata: {
                  startOffset: entity.start,
                  endOffset: entity.end,
                  entityLabel: entity.label,
                  description: entity.description
                }
              });
            }
            
            // Add sentiment as entity
            if (result.sentiment) {
              entities.push({
                entityType: 'sentiment',
                extractedText: result.sentiment.label,
                confidence: Math.abs(result.sentiment.score),
                extractionMethod: 'text_analysis',
                extractionVersion: '2.0.0',
                metadata: {
                  sentimentScore: result.sentiment.score,
                  sentimentLabel: result.sentiment.label
                }
              });
            }
            
            resolve(entities);
          } catch (parseError) {
            reject(new Error(`Failed to parse text analysis results: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Text analysis failed: ${errorOutput}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to run text analysis: ${error.message}`));
      });
    });
  }

  /**
   * Save extracted entities to database
   */
  private async saveExtractedEntities(
    investigationId: string,
    mediaSourceId: string,
    entities: ExtractedEntity[]
  ): Promise<number> {
    let savedCount = 0;

    for (const entity of entities) {
      try {
        const id = uuidv4();
        const query = `
          INSERT INTO multimodal_entities (
            id, investigation_id, media_source_id, entity_type, extracted_text,
            bbox_x, bbox_y, bbox_width, bbox_height, bbox_confidence,
            temporal_start, temporal_end, temporal_confidence,
            confidence, extraction_method, extraction_version,
            human_verified, metadata, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
          )
        `;

        const values = [
          id,
          investigationId,
          mediaSourceId,
          entity.entityType,
          entity.extractedText,
          entity.boundingBox?.x,
          entity.boundingBox?.y,
          entity.boundingBox?.width,
          entity.boundingBox?.height,
          entity.boundingBox?.confidence,
          entity.temporalRange?.startTime,
          entity.temporalRange?.endTime,
          entity.temporalRange?.confidence,
          entity.confidence,
          entity.extractionMethod,
          entity.extractionVersion,
          false,
          JSON.stringify(entity.metadata),
          new Date(),
          new Date()
        ];

        await this.db.query(query, values);
        savedCount++;

      } catch (error) {
        logger.warn(`Failed to save entity: ${error.message}`);
      }
    }

    return savedCount;
  }

  /**
   * Calculate confidence distribution
   */
  private calculateConfidenceDistribution(entities: ExtractedEntity[]): ConfidenceDistribution[] {
    const total = entities.length;
    if (total === 0) return [];

    const counts = {
      'LOW': entities.filter(e => e.confidence < 0.5).length,
      'MEDIUM': entities.filter(e => e.confidence >= 0.5 && e.confidence < 0.7).length,
      'HIGH': entities.filter(e => e.confidence >= 0.7 && e.confidence < 0.9).length,
      'VERY_HIGH': entities.filter(e => e.confidence >= 0.9).length
    };

    return Object.entries(counts).map(([level, count]) => ({
      level,
      count,
      percentage: (count / total) * 100
    }));
  }

  /**
   * Calculate job priority based on extraction methods
   */
  private calculateJobPriority(methods: string[]): number {
    // Higher priority for simpler, faster methods
    const priorities = {
      'ocr': 3,
      'face_detection': 2,
      'object_detection': 1,
      'speech_to_text': 1,
      'video_analysis': 0
    };

    const avgPriority = methods.reduce((sum, method) => {
      return sum + (priorities[method] || 1);
    }, 0) / methods.length;

    return Math.round(avgPriority);
  }

  /**
   * Setup event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    this.queueEvents.on('completed', async ({ jobId }) => {
      logger.info(`Extraction job completed: ${jobId}`);
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      logger.error(`Extraction job failed: ${jobId}, reason: ${failedReason}`);
    });

    this.queueEvents.on('progress', async ({ jobId, data }) => {
      logger.debug(`Extraction job progress: ${jobId}, progress: ${data}%`);
    });

    this.extractionWorker.on('completed', (job) => {
      logger.info(`Worker completed job: ${job.id}`);
    });

    this.extractionWorker.on('failed', (job, err) => {
      logger.error(`Worker failed job: ${job?.id}, error: ${err.message}`);
    });
  }

  /**
   * Get media source information
   */
  private async getMediaSourceInfo(mediaSourceId: string): Promise<any> {
    const query = 'SELECT * FROM media_sources WHERE id = $1';
    const result = await this.db.query(query, [mediaSourceId]);
    return result.rows[0] || null;
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    status: ProcessingStatus,
    progress?: number,
    startedAt?: Date,
    completedAt?: Date,
    durationMs?: number,
    entitiesExtracted?: number,
    errors?: string[],
    metrics?: any
  ): Promise<void> {
    const updates: string[] = ['status = $2', 'updated_at = NOW()'];
    const values: any[] = [jobId, status];
    let paramCount = 2;

    if (progress !== undefined) {
      updates.push(`progress = $${++paramCount}`);
      values.push(progress);
    }

    if (startedAt) {
      updates.push(`started_at = $${++paramCount}`);
      values.push(startedAt);
    }

    if (completedAt) {
      updates.push(`completed_at = $${++paramCount}`);
      values.push(completedAt);
    }

    if (durationMs !== undefined) {
      updates.push(`duration_ms = $${++paramCount}`);
      values.push(durationMs);
    }

    if (entitiesExtracted !== undefined) {
      updates.push(`entities_extracted = $${++paramCount}`);
      values.push(entitiesExtracted);
    }

    if (errors) {
      updates.push(`errors = $${++paramCount}`);
      values.push(errors);
    }

    if (metrics) {
      updates.push(`processing_metrics = $${++paramCount}`);
      values.push(JSON.stringify(metrics));
    }

    const query = `UPDATE extraction_jobs SET ${updates.join(', ')} WHERE id = $1`;
    await this.db.query(query, values);
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(jobId: string, progress: number): Promise<void> {
    const query = 'UPDATE extraction_jobs SET progress = $1, updated_at = NOW() WHERE id = $2';
    await this.db.query(query, [progress, jobId]);
  }

  /**
   * Map database row to ExtractionJob object
   */
  private mapRowToExtractionJob(row: any): ExtractionJob {
    return {
      id: row.id,
      investigationId: row.investigation_id,
      mediaSourceId: row.media_source_id,
      extractionMethods: row.extraction_methods,
      jobOptions: row.job_options || {},
      status: row.status as ProcessingStatus,
      progress: row.progress,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      entitiesExtracted: row.entities_extracted,
      errors: row.errors || [],
      processingMetrics: row.processing_metrics || {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down ExtractionJobService...');
    
    await this.extractionWorker.close();
    await this.extractionQueue.close();
    await this.queueEvents.close();
    await this.redis.disconnect();
    
    logger.info('ExtractionJobService shutdown complete');
  }
}

export default ExtractionJobService;