"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionJobService = void 0;
const bullmq_1 = require("bullmq");
const uuid_1 = require("uuid");
const ioredis_1 = __importDefault(require("ioredis"));
const MultimodalDataService_js_1 = require("./MultimodalDataService.js");
const ExtractionEngine_js_1 = require("../ai/ExtractionEngine.js");
const OCREngine_js_1 = __importDefault(require("../ai/engines/OCREngine.js"));
const ObjectDetectionEngine_js_1 = __importDefault(require("../ai/engines/ObjectDetectionEngine.js"));
const SpeechToTextEngine_js_1 = __importDefault(require("../ai/engines/SpeechToTextEngine.js"));
const FaceDetectionEngine_js_1 = __importDefault(require("../ai/engines/FaceDetectionEngine.js"));
const TextAnalysisEngine_js_1 = __importDefault(require("../ai/engines/TextAnalysisEngine.js"));
const EmbeddingService_js_1 = __importDefault(require("../ai/services/EmbeddingService.js"));
const path_1 = __importDefault(require("path"));
const logger = logger.child({ name: 'ExtractionJobService' });
class ExtractionJobService {
    constructor(db, redisConfig) {
        this.db = db;
        this.redis = new ioredis_1.default(redisConfig);
        // Initialize AI engines
        const engineConfig = {
            pythonPath: process.env.AI_PYTHON_PATH || 'python3',
            modelsPath: process.env.AI_MODELS_PATH || 'src/ai/models',
            tempPath: process.env.AI_TEMP_PATH || '/tmp/intelgraph',
            enableGPU: process.env.AI_ENABLE_GPU === 'true',
            maxConcurrentJobs: parseInt(process.env.AI_MAX_CONCURRENT_JOBS || '5'),
            batchSize: parseInt(process.env.AI_BATCH_SIZE || '32')
        };
        this.extractionEngine = new ExtractionEngine_js_1.ExtractionEngine(engineConfig);
        this.ocrEngine = new OCREngine_js_1.default(engineConfig);
        this.objectDetectionEngine = new ObjectDetectionEngine_js_1.default(engineConfig);
        this.speechToTextEngine = new SpeechToTextEngine_js_1.default(engineConfig);
        this.faceDetectionEngine = new FaceDetectionEngine_js_1.default(engineConfig);
        this.textAnalysisEngine = new TextAnalysisEngine_js_1.default(engineConfig);
        this.embeddingService = new EmbeddingService_js_1.default(engineConfig, db);
        // Initialize BullMQ queue for extraction jobs
        this.extractionQueue = new bullmq_1.Queue('multimodal-extraction', {
            connection: this.redis,
            defaultJobOptions: {
                removeOnComplete: 100, // Keep last 100 completed jobs
                removeOnFail: 50, // Keep last 50 failed jobs
                attempts: 3, // Retry up to 3 times
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            }
        });
        // Initialize worker for processing extraction jobs
        this.extractionWorker = new bullmq_1.Worker('multimodal-extraction', this.processExtractionJob.bind(this), {
            connection: this.redis,
            concurrency: 5, // Process up to 5 jobs concurrently
            limiter: {
                max: 10, // Maximum 10 jobs
                duration: 60000 // per minute
            }
        });
        // Initialize queue events for monitoring
        this.queueEvents = new bullmq_1.QueueEvents('multimodal-extraction', {
            connection: this.redis
        });
        this.setupEventListeners();
    }
    /**
     * Start a new extraction job
     */
    async startExtractionJob(input, userId) {
        const jobId = (0, uuid_1.v4)();
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
                MultimodalDataService_js_1.ProcessingStatus.PENDING,
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
            await this.extractionQueue.add('extract-entities', {
                jobId,
                investigationId: input.investigationId,
                mediaSourceId: input.mediaSourceId,
                extractionMethods: input.extractionMethods,
                options: input.options || {}
            }, {
                jobId, // Use our UUID as Bull job ID
                priority: this.calculateJobPriority(input.extractionMethods),
                delay: 0,
                attempts: 3
            });
            logger.info(`Started extraction job: ${jobId}, methods: ${input.extractionMethods.join(', ')}`);
            return job;
        }
        catch (error) {
            logger.error(`Failed to start extraction job:`, error);
            throw error;
        }
    }
    /**
     * Get extraction job by ID
     */
    async getExtractionJob(id) {
        try {
            const query = 'SELECT * FROM extraction_jobs WHERE id = $1';
            const result = await this.db.query(query, [id]);
            return result.rows.length > 0 ? this.mapRowToExtractionJob(result.rows[0]) : null;
        }
        catch (error) {
            logger.error(`Failed to get extraction job ${id}:`, error);
            throw error;
        }
    }
    /**
     * Get extraction jobs for investigation
     */
    async getExtractionJobs(investigationId, filters = {}) {
        try {
            let query = 'SELECT * FROM extraction_jobs WHERE investigation_id = $1';
            const values = [investigationId];
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
        }
        catch (error) {
            logger.error(`Failed to get extraction jobs for investigation ${investigationId}:`, error);
            throw error;
        }
    }
    /**
     * Cancel extraction job
     */
    async cancelExtractionJob(id) {
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
                MultimodalDataService_js_1.ProcessingStatus.CANCELLED,
                id,
                MultimodalDataService_js_1.ProcessingStatus.PENDING,
                MultimodalDataService_js_1.ProcessingStatus.IN_PROGRESS
            ]);
            if (result.rows.length === 0) {
                throw new Error(`Extraction job ${id} not found or cannot be cancelled`);
            }
            logger.info(`Cancelled extraction job: ${id}`);
            return this.mapRowToExtractionJob(result.rows[0]);
        }
        catch (error) {
            logger.error(`Failed to cancel extraction job ${id}:`, error);
            throw error;
        }
    }
    /**
     * Retry failed extraction job
     */
    async retryExtractionJob(id) {
        try {
            const job = await this.getExtractionJob(id);
            if (!job) {
                throw new Error(`Extraction job ${id} not found`);
            }
            if (job.status !== MultimodalDataService_js_1.ProcessingStatus.FAILED) {
                throw new Error(`Extraction job ${id} is not in failed state`);
            }
            // Reset job status and clear errors
            const query = `
        UPDATE extraction_jobs 
        SET status = $1, progress = 0, errors = '{}', updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
            const result = await this.db.query(query, [MultimodalDataService_js_1.ProcessingStatus.PENDING, id]);
            // Re-add to queue
            await this.extractionQueue.add('extract-entities', {
                jobId: id,
                investigationId: job.investigationId,
                mediaSourceId: job.mediaSourceId,
                extractionMethods: job.extractionMethods,
                options: job.jobOptions
            }, {
                jobId: id,
                priority: this.calculateJobPriority(job.extractionMethods)
            });
            logger.info(`Retried extraction job: ${id}`);
            return this.mapRowToExtractionJob(result.rows[0]);
        }
        catch (error) {
            logger.error(`Failed to retry extraction job ${id}:`, error);
            throw error;
        }
    }
    /**
     * Process extraction job (worker function)
     */
    async processExtractionJob(job) {
        const { jobId, investigationId, mediaSourceId, extractionMethods, options } = job.data;
        const startTime = Date.now();
        logger.info(`Processing extraction job: ${jobId}, methods: ${extractionMethods.join(', ')}`);
        try {
            // Update job status to IN_PROGRESS
            await this.updateJobStatus(jobId, MultimodalDataService_js_1.ProcessingStatus.IN_PROGRESS, 0, new Date());
            // Get media source information
            const mediaSource = await this.getMediaSourceInfo(mediaSourceId);
            if (!mediaSource) {
                throw new Error(`Media source ${mediaSourceId} not found`);
            }
            // Process each extraction method
            const allResults = [];
            const allErrors = [];
            const methodMetrics = [];
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
                }
                catch (methodError) {
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
            const metrics = {
                processingTime: totalDuration,
                entitiesExtracted: savedCount,
                confidenceDistribution,
                methodPerformance: methodMetrics
            };
            // Update job as completed
            await this.updateJobStatus(jobId, MultimodalDataService_js_1.ProcessingStatus.COMPLETED, 1.0, new Date(), new Date(), totalDuration, savedCount, allErrors, metrics);
            logger.info(`Completed extraction job: ${jobId}, extracted: ${savedCount} entities, duration: ${totalDuration}ms`);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error.message || 'Unknown error';
            await this.updateJobStatus(jobId, MultimodalDataService_js_1.ProcessingStatus.FAILED, undefined, undefined, new Date(), duration, 0, [errorMsg]);
            logger.error(`Failed extraction job ${jobId}:`, error);
            throw error; // Re-throw for BullMQ retry handling
        }
    }
    /**
     * Perform extraction using specified method with real AI engines
     */
    async performExtraction(method, mediaSource, options) {
        const entities = [];
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
        }
        catch (error) {
            logger.error(`Extraction method ${method} failed:`, error);
            throw error;
        }
    }
    /**
     * Run OCR extraction using OCREngine
     */
    async runOCRExtraction(filePath, options) {
        try {
            const ocrOptions = {
                language: options.language || 'eng',
                enhanceImage: options.enhanceImage !== false,
                confidenceThreshold: options.confidenceThreshold || 0.6,
                preserveWhitespace: options.preserveWhitespace || false,
                enableStructureAnalysis: options.enableStructureAnalysis !== false
            };
            const results = await this.ocrEngine.extractText(filePath, ocrOptions);
            const entities = [];
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
        }
        catch (error) {
            logger.error('OCR extraction failed:', error);
            throw new Error(`OCR extraction failed: ${error.message}`);
        }
    }
    /**
     * Run object detection using ObjectDetectionEngine
     */
    async runObjectDetection(filePath, options) {
        try {
            const detectionOptions = {
                model: options.model || 'yolov8n.pt',
                confidenceThreshold: options.confidenceThreshold || 0.5,
                nmsThreshold: options.nmsThreshold || 0.4,
                enableTracking: options.enableTracking || false,
                targetClasses: options.targetClasses || []
            };
            const results = await this.objectDetectionEngine.detectObjects(filePath, detectionOptions);
            const entities = [];
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
        }
        catch (error) {
            logger.error('Object detection failed:', error);
            throw new Error(`Object detection failed: ${error.message}`);
        }
    }
    /**
     * Run speech-to-text using Python script
     */
    async runSpeechToText(filePath, options) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const pythonScript = path_1.default.join(__dirname, '../ai/models/whisper_transcription.py');
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
                        const entities = [];
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
                    }
                    catch (parseError) {
                        reject(new Error(`Failed to parse speech-to-text results: ${parseError.message}`));
                    }
                }
                else {
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
    async runFaceDetection(filePath, options) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const pythonScript = path_1.default.join(__dirname, '../ai/models/mtcnn_detection.py');
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
                        const entities = [];
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
                    }
                    catch (parseError) {
                        reject(new Error(`Failed to parse face detection results: ${parseError.message}`));
                    }
                }
                else {
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
    async runTextAnalysis(filePath, options) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const pythonScript = path_1.default.join(__dirname, '../ai/models/named_entity_recognition.py');
            // Read text file content
            const fs = require('fs');
            let textContent = '';
            try {
                textContent = fs.readFileSync(filePath, 'utf8');
            }
            catch (error) {
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
                        const entities = [];
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
                    }
                    catch (parseError) {
                        reject(new Error(`Failed to parse text analysis results: ${parseError.message}`));
                    }
                }
                else {
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
    async saveExtractedEntities(investigationId, mediaSourceId, entities) {
        let savedCount = 0;
        for (const entity of entities) {
            try {
                const id = (0, uuid_1.v4)();
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
            }
            catch (error) {
                logger.warn(`Failed to save entity: ${error.message}`);
            }
        }
        return savedCount;
    }
    /**
     * Calculate confidence distribution
     */
    calculateConfidenceDistribution(entities) {
        const total = entities.length;
        if (total === 0)
            return [];
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
    calculateJobPriority(methods) {
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
    setupEventListeners() {
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
    async getMediaSourceInfo(mediaSourceId) {
        const query = 'SELECT * FROM media_sources WHERE id = $1';
        const result = await this.db.query(query, [mediaSourceId]);
        return result.rows[0] || null;
    }
    /**
     * Update job status in database
     */
    async updateJobStatus(jobId, status, progress, startedAt, completedAt, durationMs, entitiesExtracted, errors, metrics) {
        const updates = ['status = $2', 'updated_at = NOW()'];
        const values = [jobId, status];
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
    async updateJobProgress(jobId, progress) {
        const query = 'UPDATE extraction_jobs SET progress = $1, updated_at = NOW() WHERE id = $2';
        await this.db.query(query, [progress, jobId]);
    }
    /**
     * Map database row to ExtractionJob object
     */
    mapRowToExtractionJob(row) {
        return {
            id: row.id,
            investigationId: row.investigation_id,
            mediaSourceId: row.media_source_id,
            extractionMethods: row.extraction_methods,
            jobOptions: row.job_options || {},
            status: row.status,
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
    async shutdown() {
        logger.info('Shutting down ExtractionJobService...');
        await this.extractionWorker.close();
        await this.extractionQueue.close();
        await this.queueEvents.close();
        await this.redis.disconnect();
        logger.info('ExtractionJobService shutdown complete');
    }
}
exports.ExtractionJobService = ExtractionJobService;
exports.default = ExtractionJobService;
//# sourceMappingURL=ExtractionJobService.js.map