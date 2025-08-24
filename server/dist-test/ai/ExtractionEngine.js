"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionEngine = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const OCREngine_js_1 = require("./engines/OCREngine.js");
const ObjectDetectionEngine_js_1 = require("./engines/ObjectDetectionEngine.js");
const SpeechToTextEngine_js_1 = require("./engines/SpeechToTextEngine.js");
const FaceDetectionEngine_js_1 = require("./engines/FaceDetectionEngine.js");
const TextAnalysisEngine_js_1 = require("./engines/TextAnalysisEngine.js");
const EmbeddingService_js_1 = require("./services/EmbeddingService.js");
const VideoFrameExtractor_js_1 = require("./engines/VideoFrameExtractor.js"); // WAR-GAMED SIMULATION - Import VideoFrameExtractor
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static")); // WAR-GAMED SIMULATION - Import ffmpeg-static
const ffprobe_static_1 = __importDefault(require("ffprobe-static")); // WAR-GAMED SIMULATION - Import ffprobe-static
const logger = logger.child({ name: 'ExtractionEngine' });
class ExtractionEngine {
    constructor(config, db) {
        this.activeJobs = new Map();
        this.config = config;
        this.db = db;
        // Initialize AI/ML engines
        this.ocrEngine = new OCREngine_js_1.OCREngine(config);
        this.objectDetectionEngine = new ObjectDetectionEngine_js_1.ObjectDetectionEngine(config);
        this.speechEngine = new SpeechToTextEngine_js_1.SpeechToTextEngine(config);
        this.faceEngine = new FaceDetectionEngine_js_1.FaceDetectionEngine(config);
        this.textEngine = new TextAnalysisEngine_js_1.TextAnalysisEngine(config);
        this.embeddingService = new EmbeddingService_js_1.EmbeddingService(config);
        // WAR-GAMED SIMULATION - Initialize VideoFrameExtractor
        this.videoFrameExtractor = new VideoFrameExtractor_js_1.VideoFrameExtractor(ffmpeg_static_1.default || 'ffmpeg', // Use static path or default
        ffprobe_static_1.default || 'ffprobe', // Use static path or default
        config.tempPath);
    }
    /**
     * Process extraction request using multiple AI models
     */
    async processExtraction(request) {
        const { jobId, mediaPath, mediaType, extractionMethods, options } = request;
        const startTime = Date.now();
        logger.info(`Starting extraction job: ${jobId}, methods: ${extractionMethods.join(', ')}`);
        const results = [];
        const overallErrors = [];
        try {
            // Track active job
            this.activeJobs.set(jobId, { startTime, status: 'running' });
            // Process each extraction method
            for (const method of extractionMethods) {
                try {
                    const methodStartTime = Date.now();
                    let result;
                    switch (method) {
                        case 'ocr':
                            result = await this.performOCR(jobId, mediaPath, mediaType, options);
                            break;
                        case 'object_detection':
                            result = await this.performObjectDetection(jobId, mediaPath, mediaType, options);
                            break;
                        case 'face_detection':
                            result = await this.performFaceDetection(jobId, mediaPath, mediaType, options);
                            break;
                        case 'speech_to_text':
                            result = await this.performSpeechToText(jobId, mediaPath, mediaType, options);
                            break;
                        case 'text_analysis':
                            result = await this.performTextAnalysis(jobId, mediaPath, mediaType, options);
                            break;
                        case 'scene_analysis':
                            result = await this.performSceneAnalysis(jobId, mediaPath, mediaType, options);
                            break;
                        case 'entity_extraction':
                            result = await this.performEntityExtraction(jobId, mediaPath, mediaType, options);
                            break;
                        // WAR-GAMED SIMULATION - New case for video analysis
                        case 'video_analysis':
                            if (mediaType !== MediaType.VIDEO) {
                                throw new Error(`Video analysis only supported for media type: ${MediaType.VIDEO}`);
                            }
                            result = await this.performVideoAnalysis(jobId, mediaPath, options);
                            break;
                        default:
                            throw new Error(`Unknown extraction method: ${method}`);
                    }
                    // Generate embeddings for extracted entities
                    await this.generateEmbeddings(result.entities);
                    results.push(result);
                    const methodDuration = Date.now() - methodStartTime;
                    logger.info(`Completed ${method} for job ${jobId}: ${result.entities.length} entities, ${methodDuration}ms`);
                }
                catch (methodError) {
                    const errorMsg = `Failed ${method}: ${methodError.message}`;
                    overallErrors.push(errorMsg);
                    logger.error(`Extraction method ${method} failed for job ${jobId}:`, methodError);
                }
            }
            const totalDuration = Date.now() - startTime;
            logger.info(`Extraction job ${jobId} completed: ${results.length} methods, ${totalDuration}ms`);
            return results;
        }
        catch (error) {
            logger.error(`Extraction job ${jobId} failed:`, error);
            throw error;
        }
        finally {
            this.activeJobs.delete(jobId);
        }
    }
    /**
     * Perform OCR using Tesseract and PaddleOCR
     */
    async performOCR(jobId, mediaPath, mediaType, options) {
        if (mediaType !== MediaType.IMAGE && mediaType !== MediaType.VIDEO) {
            throw new Error(`OCR not supported for media type: ${mediaType}`);
        }
        const startTime = Date.now();
        const entities = [];
        const errors = [];
        try {
            // Use OCR engine for text extraction
            const ocrResults = await this.ocrEngine.extractText(mediaPath, {
                language: options.language || 'eng',
                enhanceImage: options.enhanceImage !== false,
                confidenceThreshold: options.confidenceThreshold || 0.6
            });
            for (const result of ocrResults) {
                entities.push({
                    entityType: 'text',
                    extractedText: result.text,
                    boundingBox: result.boundingBox,
                    confidence: result.confidence,
                    extractionMethod: 'ocr',
                    extractionVersion: '2.0.0',
                    metadata: {
                        language: result.language,
                        ocrEngine: result.engine,
                        wordCount: result.text.split(' ').length,
                        characterCount: result.text.length
                    }
                });
            }
            const processingTime = Date.now() - startTime;
            const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length || 0;
            return {
                jobId,
                method: 'ocr',
                entities,
                metrics: {
                    processingTime,
                    entitiesExtracted: entities.length,
                    averageConfidence: avgConfidence,
                    memoryUsage: process.memoryUsage().heapUsed,
                    modelVersion: 'tesseract-5.3.0'
                },
                errors
            };
        }
        catch (error) {
            errors.push(error.message);
            throw error;
        }
    }
    /**
     * Perform object detection using YOLO and other models
     */
    async performObjectDetection(jobId, mediaPath, mediaType, options) {
        if (mediaType !== MediaType.IMAGE && mediaType !== MediaType.VIDEO) {
            throw new Error(`Object detection not supported for media type: ${mediaType}`);
        }
        const startTime = Date.now();
        const entities = [];
        try {
            const detections = await this.objectDetectionEngine.detectObjects(mediaPath, {
                model: options.model || 'yolov8n',
                confidenceThreshold: options.confidenceThreshold || 0.5,
                nmsThreshold: options.nmsThreshold || 0.4,
                maxDetections: options.maxDetections || 100
            });
            for (const detection of detections) {
                entities.push({
                    entityType: detection.className,
                    boundingBox: detection.boundingBox,
                    confidence: detection.confidence,
                    extractionMethod: 'object_detection',
                    extractionVersion: '2.0.0',
                    metadata: {
                        model: detection.model,
                        classId: detection.classId,
                        trackingId: detection.trackingId
                    }
                });
            }
            const processingTime = Date.now() - startTime;
            const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length || 0;
            return {
                jobId,
                method: 'object_detection',
                entities,
                metrics: {
                    processingTime,
                    entitiesExtracted: entities.length,
                    averageConfidence: avgConfidence,
                    memoryUsage: process.memoryUsage().heapUsed,
                    modelVersion: 'yolov8n-1.0'
                },
                errors: []
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Perform face detection and recognition
     */
    async performFaceDetection(jobId, mediaPath, mediaType, options) {
        if (mediaType !== MediaType.IMAGE && mediaType !== MediaType.VIDEO) {
            throw new Error(`Face detection not supported for media type: ${mediaType}`);
        }
        const startTime = Date.now();
        const entities = [];
        try {
            const faces = await this.faceEngine.detectFaces(mediaPath, {
                minFaceSize: options.minFaceSize || 20,
                confidenceThreshold: options.confidenceThreshold || 0.7,
                extractFeatures: options.extractFeatures !== false,
                recognizeIdentities: options.recognizeIdentities === true
            });
            for (const face of faces) {
                entities.push({
                    entityType: 'face',
                    boundingBox: face.boundingBox,
                    confidence: face.confidence,
                    extractionMethod: 'face_detection',
                    extractionVersion: '2.0.0',
                    metadata: {
                        landmarks: face.landmarks,
                        age: face.estimatedAge,
                        gender: face.estimatedGender,
                        emotion: face.dominantEmotion,
                        identity: face.recognizedIdentity,
                        features: face.featureVector
                    }
                });
            }
            const processingTime = Date.now() - startTime;
            const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length || 0;
            return {
                jobId,
                method: 'face_detection',
                entities,
                metrics: {
                    processingTime,
                    entitiesExtracted: entities.length,
                    averageConfidence: avgConfidence,
                    memoryUsage: process.memoryUsage().heapUsed,
                    modelVersion: 'mtcnn-pytorch-1.0'
                },
                errors: []
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Perform speech-to-text transcription
     */
    async performSpeechToText(jobId, mediaPath, mediaType, options) {
        if (mediaType !== MediaType.AUDIO && mediaType !== MediaType.VIDEO) {
            throw new Error(`Speech-to-text not supported for media type: ${mediaType}`);
        }
        const startTime = Date.now();
        const entities = [];
        try {
            const transcriptions = await this.speechEngine.transcribe(mediaPath, {
                language: options.language || 'en',
                model: options.model || 'whisper-base',
                enableDiarization: options.enableDiarization === true,
                enhanceAudio: options.enhanceAudio !== false,
                timestamping: options.timestamping !== false
            });
            for (const segment of transcriptions) {
                entities.push({
                    entityType: 'speech',
                    extractedText: segment.text,
                    temporalRange: {
                        startTime: segment.startTime,
                        endTime: segment.endTime,
                        confidence: segment.confidence
                    },
                    confidence: segment.confidence,
                    extractionMethod: 'speech_to_text',
                    extractionVersion: '2.0.0',
                    metadata: {
                        speaker: segment.speaker,
                        language: segment.detectedLanguage,
                        wordCount: segment.text.split(' ').length,
                        audioQuality: segment.audioQuality,
                        noiseLevel: segment.noiseLevel
                    }
                });
            }
            const processingTime = Date.now() - startTime;
            const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length || 0;
            return {
                jobId,
                method: 'speech_to_text',
                entities,
                metrics: {
                    processingTime,
                    entitiesExtracted: entities.length,
                    averageConfidence: avgConfidence,
                    memoryUsage: process.memoryUsage().heapUsed,
                    modelVersion: 'whisper-base-v20231117'
                },
                errors: []
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Perform advanced text analysis (NER, sentiment, topics)
     */
    async performTextAnalysis(jobId, mediaPath, mediaType, options) {
        const startTime = Date.now();
        const entities = [];
        try {
            // Get text content from various sources
            let textContent = '';
            if (mediaType === MediaType.TEXT) {
                textContent = await this.readTextFile(mediaPath);
            }
            else {
                // Extract text from other media types first
                const ocrResult = await this.performOCR(jobId, mediaPath, mediaType, options);
                textContent = ocrResult.entities.map(e => e.extractedText).join(' ');
            }
            if (!textContent.trim()) {
                return {
                    jobId,
                    method: 'text_analysis',
                    entities: [],
                    metrics: {
                        processingTime: Date.now() - startTime,
                        entitiesExtracted: 0,
                        averageConfidence: 0,
                        memoryUsage: process.memoryUsage().heapUsed,
                        modelVersion: 'spacy-en-3.7.0'
                    },
                    errors: ['No text content found']
                };
            }
            const analysis = await this.textEngine.analyzeText(textContent, {
                extractEntities: options.extractEntities !== false,
                performSentiment: options.performSentiment !== false,
                extractTopics: options.extractTopics === true,
                detectLanguage: options.detectLanguage !== false
            });
            // Named entities
            for (const entity of analysis.entities) {
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
            // Topics as entities
            for (const topic of analysis.topics) {
                entities.push({
                    entityType: 'topic',
                    extractedText: topic.keywords.join(', '),
                    confidence: topic.coherence,
                    extractionMethod: 'text_analysis',
                    extractionVersion: '2.0.0',
                    metadata: {
                        topicId: topic.id,
                        keywords: topic.keywords,
                        coherenceScore: topic.coherence
                    }
                });
            }
            // Overall sentiment as entity
            if (analysis.sentiment) {
                entities.push({
                    entityType: 'sentiment',
                    extractedText: analysis.sentiment.label,
                    confidence: Math.abs(analysis.sentiment.score),
                    extractionMethod: 'text_analysis',
                    extractionVersion: '2.0.0',
                    metadata: {
                        sentimentScore: analysis.sentiment.score,
                        sentimentLabel: analysis.sentiment.label,
                        confidence: analysis.sentiment.confidence
                    }
                });
            }
            const processingTime = Date.now() - startTime;
            const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length || 0;
            return {
                jobId,
                method: 'text_analysis',
                entities,
                metrics: {
                    processingTime,
                    entitiesExtracted: entities.length,
                    averageConfidence: avgConfidence,
                    memoryUsage: process.memoryUsage().heapUsed,
                    modelVersion: 'spacy-en-core-web-lg-3.7.0'
                },
                errors: []
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Perform scene analysis for images and videos
     */
    async performSceneAnalysis(jobId, mediaPath, mediaType, options) {
        if (mediaType !== MediaType.IMAGE && mediaType !== MediaType.VIDEO) {
            throw new Error(`Scene analysis not supported for media type: ${mediaType}`);
        }
        const startTime = Date.now();
        const entities = [];
        try {
            // This would integrate with scene classification models
            // For now, providing a structured approach
            const sceneAnalysis = await this.analyzeScene(mediaPath, {
                detectObjects: true,
                classifyScene: true,
                extractColors: true,
                analyzeComposition: true
            });
            // Scene classification
            entities.push({
                entityType: 'scene',
                extractedText: sceneAnalysis.sceneType,
                confidence: sceneAnalysis.sceneConfidence,
                extractionMethod: 'scene_analysis',
                extractionVersion: '2.0.0',
                metadata: {
                    sceneCategories: sceneAnalysis.categories,
                    dominantColors: sceneAnalysis.colors,
                    lighting: sceneAnalysis.lighting,
                    composition: sceneAnalysis.composition
                }
            });
            const processingTime = Date.now() - startTime;
            return {
                jobId,
                method: 'scene_analysis',
                entities,
                metrics: {
                    processingTime,
                    entitiesExtracted: entities.length,
                    averageConfidence: entities[0]?.confidence || 0,
                    memoryUsage: process.memoryUsage().heapUsed,
                    modelVersion: 'resnet50-places365'
                },
                errors: []
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Perform entity extraction across all modalities
     */
    async performEntityExtraction(jobId, mediaPath, mediaType, options) {
        const startTime = Date.now();
        const allEntities = [];
        try {
            // Run multiple extraction methods and combine results
            const methods = this.getApplicableMethods(mediaType);
            for (const method of methods) {
                try {
                    const result = await this.processExtraction({
                        jobId: `${jobId}_${method}`,
                        mediaSourceId: '',
                        mediaPath,
                        mediaType,
                        extractionMethods: [method],
                        options
                    });
                    if (result.length > 0) {
                        allEntities.push(...result[0].entities);
                    }
                }
                catch (methodError) {
                    logger.warn(`Entity extraction method ${method} failed:`, methodError);
                }
            }
            // Remove duplicates and merge similar entities
            const mergedEntities = this.mergeAndDeduplicateEntities(allEntities);
            const processingTime = Date.now() - startTime;
            const avgConfidence = mergedEntities.reduce((sum, e) => sum + e.confidence, 0) / mergedEntities.length || 0;
            return {
                jobId,
                method: 'entity_extraction',
                entities: mergedEntities,
                metrics: {
                    processingTime,
                    entitiesExtracted: mergedEntities.length,
                    averageConfidence: avgConfidence,
                    memoryUsage: process.memoryUsage().heapUsed,
                    modelVersion: 'multi-modal-v2.0'
                },
                errors: []
            };
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Perform video analysis (frame-by-frame processing)
     */
    async performVideoAnalysis(jobId, videoPath, options) {
        // WAR-GAMED SIMULATION - For video analysis
        const startTime = Date.now();
        const allEntities = [];
        const errors = [];
        let tempFrameDir;
        let tempAudioPath;
        try {
            // 1. Extract frames and audio
            const { frames, audio } = await this.videoFrameExtractor.extract(videoPath, {
                frameRate: options.frameRate || 1, // Default to 1 frame per second
                extractAudio: options.extractAudio === true,
                outputDir: path_1.default.join(this.config.tempPath, `video-frames-${jobId}`),
            });
            tempFrameDir = path_1.default.join(this.config.tempPath, `video-frames-${jobId}`);
            if (audio) {
                tempAudioPath = audio.audioPath;
                // Process audio with SpeechToTextEngine
                try {
                    const speechResult = await this.performSpeechToText(jobId, tempAudioPath, MediaType.AUDIO, options);
                    allEntities.push(...speechResult.entities);
                }
                catch (speechError) {
                    logger.warn(`Speech-to-text failed for video ${jobId}: ${speechError.message}`);
                    errors.push(`Speech-to-text failed: ${speechError.message}`);
                }
            }
            // 2. Process each frame with image-based engines
            for (const frame of frames) {
                const frameEntities = [];
                const frameOptions = { ...options, frameTimestamp: frame.timestamp, frameNumber: frame.frameNumber };
                // Run Face Detection
                try {
                    const faceResult = await this.performFaceDetection(jobId, frame.framePath, MediaType.IMAGE, frameOptions);
                    frameEntities.push(...faceResult.entities);
                }
                catch (faceError) {
                    logger.warn(`Face detection failed for frame ${frame.frameNumber}: ${faceError.message}`);
                    errors.push(`Face detection for frame ${frame.frameNumber} failed: ${faceError.message}`);
                }
                // Run Object Detection
                try {
                    const objectResult = await this.performObjectDetection(jobId, frame.framePath, MediaType.IMAGE, frameOptions);
                    frameEntities.push(...objectResult.entities);
                }
                catch (objectError) {
                    logger.warn(`Object detection failed for frame ${frame.frameNumber}: ${objectError.message}`);
                    errors.push(`Object detection for frame ${frame.frameNumber} failed: ${objectError.message}`);
                }
                // Run OCR
                try {
                    const ocrResult = await this.performOCR(jobId, frame.framePath, MediaType.IMAGE, frameOptions);
                    frameEntities.push(...ocrResult.entities);
                }
                catch (ocrError) {
                    logger.warn(`OCR failed for frame ${frame.frameNumber}: ${ocrError.message}`);
                    errors.push(`OCR for frame ${frame.frameNumber} failed: ${ocrError.message}`);
                }
                // Add frame-specific metadata to entities
                frameEntities.forEach(entity => {
                    entity.metadata = {
                        ...entity.metadata,
                        frameTimestamp: frame.timestamp,
                        frameNumber: frame.frameNumber,
                        framePath: frame.framePath, // For debugging/reference
                    };
                    // Ensure temporalRange is set for frame-based entities
                    if (!entity.temporalRange) {
                        entity.temporalRange = {
                            startTime: frame.timestamp,
                            endTime: frame.timestamp,
                            confidence: entity.confidence, // Use entity confidence for temporal range
                        };
                    }
                });
                allEntities.push(...frameEntities);
            }
            const processingTime = Date.now() - startTime;
            const avgConfidence = allEntities.reduce((sum, e) => sum + e.confidence, 0) / allEntities.length || 0;
            return {
                jobId,
                method: 'video_analysis',
                entities: allEntities,
                metrics: {
                    processingTime,
                    entitiesExtracted: allEntities.length,
                    averageConfidence: avgConfidence,
                    memoryUsage: process.memoryUsage().heapUsed,
                    modelVersion: 'multi-modal-video-v1.0'
                },
                errors
            };
        }
        catch (error) {
            logger.error(`Video analysis failed for ${videoPath}: ${error.message}`);
            errors.push(`Video analysis failed: ${error.message}`);
            throw error;
        }
        finally {
            // Clean up temporary files
            if (tempFrameDir) {
                await this.videoFrameExtractor.cleanup(tempFrameDir);
            }
            // Audio cleanup is handled by frame extractor's cleanup if it's in the same dir
        }
    }
    /**
     * Generate embeddings for extracted entities
     */
    async generateEmbeddings(entities) {
        for (const entity of entities) {
            try {
                if (entity.extractedText) {
                    entity.embeddings = entity.embeddings || {};
                    entity.embeddings.text = await this.embeddingService.generateTextEmbedding(entity.extractedText);
                }
                // Add visual and audio embeddings based on entity type and available data
                if (entity.boundingBox && (entity.entityType === 'face' || entity.entityType === 'object')) {
                    // Generate visual embeddings from bounding box region
                    // entity.embeddings.visual = await this.embeddingService.generateVisualEmbedding(...);
                }
                if (entity.temporalRange && entity.entityType === 'speech') {
                    // Generate audio embeddings from temporal segment
                    // entity.embeddings.audio = await this.embeddingService.generateAudioEmbedding(...);
                }
            }
            catch (error) {
                logger.warn(`Failed to generate embeddings for entity ${entity.entityType}:`, error.message);
            }
        }
    }
    /**
     * Get applicable extraction methods for media type
     */
    getApplicableMethods(mediaType) {
        switch (mediaType) {
            case MediaType.IMAGE:
                return ['ocr', 'object_detection', 'face_detection', 'scene_analysis'];
            case MediaType.VIDEO:
                // WAR-GAMED SIMULATION - Video analysis is a new top-level method
                return ['video_analysis']; // This will orchestrate other methods internally
            case MediaType.AUDIO:
                return ['speech_to_text'];
            case MediaType.TEXT:
                return ['text_analysis'];
            case MediaType.DOCUMENT:
                return ['ocr', 'text_analysis'];
            default:
                return ['text_analysis'];
        }
    }
    /**
     * Merge and deduplicate similar entities
     */
    mergeAndDeduplicateEntities(entities) {
        // Simple deduplication based on text similarity and spatial overlap
        const merged = [];
        for (const entity of entities) {
            const similar = merged.find(existing => this.areEntitiesSimilar(existing, entity));
            if (similar) {
                // Merge entities by taking higher confidence values
                if (entity.confidence > similar.confidence) {
                    similar.confidence = entity.confidence;
                    similar.extractedText = entity.extractedText || similar.extractedText;
                }
            }
            else {
                merged.push(entity);
            }
        }
        return merged;
    }
    /**
     * Check if two entities are similar enough to merge
     */
    areEntitiesSimilar(entity1, entity2) {
        // Same entity type
        if (entity1.entityType !== entity2.entityType)
            return false;
        // Text similarity
        if (entity1.extractedText && entity2.extractedText) {
            const textSimilarity = this.calculateTextSimilarity(entity1.extractedText, entity2.extractedText);
            if (textSimilarity > 0.8)
                return true;
        }
        // Spatial overlap for bounding boxes
        if (entity1.boundingBox && entity2.boundingBox) {
            const spatialOverlap = this.calculateBoundingBoxOverlap(entity1.boundingBox, entity2.boundingBox);
            if (spatialOverlap > 0.5)
                return true;
        }
        // Temporal overlap
        if (entity1.temporalRange && entity2.temporalRange) {
            const temporalOverlap = this.calculateTemporalOverlap(entity1.temporalRange, entity2.temporalRange);
            if (temporalOverlap > 0.7)
                return true;
        }
        return false;
    }
    /**
     * Calculate text similarity using simple token overlap
     */
    calculateTextSimilarity(text1, text2) {
        const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
        const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);
        return intersection.size / union.size;
    }
    /**
     * Calculate bounding box overlap (IoU)
     */
    calculateBoundingBoxOverlap(box1, box2) {
        const x1 = Math.max(box1.x, box2.x);
        const y1 = Math.max(box1.y, box2.y);
        const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
        const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
        if (x2 <= x1 || y2 <= y1)
            return 0;
        const intersectionArea = (x2 - x1) * (y2 - y1);
        const box1Area = box1.width * box1.height;
        const box2Area = box2.width * box2.height;
        const unionArea = box1Area + box2Area - intersectionArea;
        return intersectionArea / unionArea;
    }
    /**
     * Calculate temporal range overlap
     */
    calculateTemporalOverlap(range1, range2) {
        const start = Math.max(range1.startTime, range2.startTime);
        const end = Math.min(range1.endTime, range2.endTime);
        if (end <= start)
            return 0;
        const intersectionDuration = end - start;
        const range1Duration = range1.endTime - range1.startTime;
        const range2Duration = range2.endTime - range2.startTime;
        const unionDuration = range1Duration + range2Duration - intersectionDuration;
        return intersectionDuration / unionDuration;
    }
    /**
     * Read text file content
     */
    async readTextFile(filePath) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const stream = (0, fs_1.createReadStream)(filePath);
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            stream.on('error', reject);
        });
    }
    /**
     * Analyze scene content (placeholder implementation)
     */
    async analyzeScene(mediaPath, options) {
        // This would integrate with actual scene analysis models
        return {
            sceneType: 'outdoor_natural',
            sceneConfidence: 0.85,
            categories: ['outdoor', 'natural', 'landscape'],
            colors: ['green', 'blue', 'brown'],
            lighting: 'daylight',
            composition: 'rule_of_thirds'
        };
    }
    /**
     * Get extraction engine status
     */
    getStatus() {
        return {
            activeJobs: this.activeJobs.size,
            maxConcurrentJobs: this.config.maxConcurrentJobs,
            enableGPU: this.config.enableGPU,
            engines: {
                ocr: this.ocrEngine.isReady(),
                objectDetection: this.objectDetectionEngine.isReady(),
                speech: this.speechEngine.isReady(),
                face: this.faceEngine.isReady(),
                text: this.textEngine.isReady()
            }
        };
    }
    /**
     * Cleanup resources
     */
    async shutdown() {
        logger.info('Shutting down ExtractionEngine...');
        // Wait for active jobs to complete or timeout
        const shutdownTimeout = 30000; // 30 seconds
        const startTime = Date.now();
        while (this.activeJobs.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Cleanup engines
        await Promise.all([
            this.ocrEngine.shutdown(),
            this.objectDetectionEngine.shutdown(),
            this.speechEngine.shutdown(),
            this.faceEngine.shutdown(),
            this.textEngine.shutdown(),
            this.embeddingService.shutdown()
        ]);
        logger.info('ExtractionEngine shutdown complete');
    }
}
exports.ExtractionEngine = ExtractionEngine;
exports.default = ExtractionEngine;
//# sourceMappingURL=ExtractionEngine.js.map