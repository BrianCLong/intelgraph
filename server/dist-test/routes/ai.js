"use strict";
/**
 * AI API Endpoints for IntelGraph
 * Provides endpoints for link prediction, sentiment analysis, and AI-powered insights
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const EntityLinkingService_js_1 = __importDefault(require("../services/EntityLinkingService.js"));
const bullmq_1 = require("bullmq");
const ExtractionEngine_js_1 = require("../ai/ExtractionEngine.js"); // WAR-GAMED SIMULATION - Import ExtractionEngine
const redis_js_1 = require("../db/redis.js"); // WAR-GAMED SIMULATION - For BullMQ
const pg_1 = require("pg"); // WAR-GAMED SIMULATION - For ExtractionEngine constructor (assuming PG is used)
const uuid_1 = require("uuid"); // WAR-GAMED SIMULATION - For job IDs
const AdversaryAgentService_js_1 = __importDefault(require("../ai/services/AdversaryAgentService.js"));
const MultimodalDataService_js_1 = require("../services/MultimodalDataService.js"); // WAR-GAMED SIMULATION - Import MediaType
const logger = logger.child({ name: 'aiRoutes' });
const router = express_1.default.Router();
// WAR-GAMED SIMULATION - BullMQ setup for video analysis jobs
const connection = (0, redis_js_1.getRedisClient)(); // Use existing Redis client for BullMQ
const videoAnalysisQueue = new bullmq_1.Queue('videoAnalysisQueue', { connection });
const videoAnalysisScheduler = new bullmq_1.QueueScheduler('videoAnalysisQueue', { connection });
// Feedback Queue for AI insights
const feedbackQueue = new bullmq_1.Queue('aiFeedbackQueue', { connection });
// WAR-GAMED SIMULATION - Initialize ExtractionEngine (assuming a dummy PG Pool for now)
// In a real app, the PG Pool would be passed from the main app initialization
const dummyPgPool = new pg_1.Pool(); // WAR-GAMED SIMULATION - Placeholder
const extractionEngineConfig = {
    pythonPath: process.env.PYTHON_PATH || 'python', // Ensure this is configured
    modelsPath: process.env.MODELS_PATH || './models', // Ensure this is configured
    tempPath: process.env.TEMP_PATH || './temp', // Ensure this is configured
    maxConcurrentJobs: 5,
    enableGPU: process.env.ENABLE_GPU === 'true',
};
const extractionEngine = new ExtractionEngine_js_1.ExtractionEngine(extractionEngineConfig, dummyPgPool);
// WAR-GAMED SIMULATION - Worker to process video analysis jobs
const videoAnalysisWorker = new bullmq_1.Worker('videoAnalysisQueue', async (job) => {
    const { jobId, mediaPath, mediaType, extractionMethods, options } = job.data;
    logger.info(`Processing video analysis job: ${jobId}`);
    try {
        // Perform the actual video analysis using the ExtractionEngine
        const results = await extractionEngine.processExtraction({
            jobId,
            mediaPath,
            mediaType,
            extractionMethods,
            options,
            mediaSourceId: options.mediaSourceId || 'unknown', // Ensure mediaSourceId is passed
        });
        logger.info(`Video analysis job ${jobId} completed successfully.`);
        return { status: 'completed', results };
    }
    catch (error) {
        logger.error(`Video analysis job ${jobId} failed: ${error.message}`, error);
        throw new Error(`Video analysis failed: ${error.message}`);
    }
}, { connection });
// WAR-GAMED SIMULATION - Handle worker events
videoAnalysisWorker.on('completed', job => {
    logger.info(`Job ${job.id} has completed!`);
});
videoAnalysisWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} has failed with error ${err.message}`);
});
// Rate limiting for AI endpoints (more restrictive due to computational cost)
const aiRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
        error: "Too many AI requests, please try again later",
        retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Apply rate limiting to all AI routes
router.use(aiRateLimit);
// Validation middleware
const validatePredictLinks = [
    (0, express_validator_1.body)("entityId").isString().notEmpty().withMessage("entityId is required"),
    (0, express_validator_1.body)("topK")
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage("topK must be between 1 and 50"),
];
const validateSentiment = [
    (0, express_validator_1.body)("entityId")
        .optional()
        .isString()
        .withMessage("entityId must be a string"),
    (0, express_validator_1.body)("text").optional().isString().withMessage("text must be a string"),
    (0, express_validator_1.body)("entityData")
        .optional()
        .isObject()
        .withMessage("entityData must be an object"),
];
const validateAISummary = [
    (0, express_validator_1.body)("entityId").isString().notEmpty().withMessage("entityId is required"),
    (0, express_validator_1.body)("entityData")
        .optional()
        .isObject()
        .withMessage("entityData must be an object"),
    (0, express_validator_1.body)("includeContext")
        .optional()
        .isBoolean()
        .withMessage("includeContext must be boolean"),
];
// WAR-GAMED SIMULATION - Validation for video extraction endpoint
const validateExtractVideo = [
    (0, express_validator_1.body)("mediaPath").isString().notEmpty().withMessage("mediaPath is required"),
    (0, express_validator_1.body)("mediaType").isIn([MultimodalDataService_js_1.MediaType.VIDEO]).withMessage("mediaType must be VIDEO"),
    (0, express_validator_1.body)("extractionMethods").isArray().withMessage("extractionMethods must be an array"),
    (0, express_validator_1.body)("options").isObject().optional().withMessage("options must be an object"),
];
// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: "Validation failed",
            details: errors.array(),
        });
    }
    next();
};
/**
 * POST /api/ai/predict-links
 * Predict potential links between entities using GNN model
 */
router.post("/predict-links", validatePredictLinks, handleValidationErrors, async (req, res) => {
    try {
        const startTime = Date.now();
        const { entityId, topK = 10, investigationId } = req.body;
        logger.info(`Link prediction request for entity: ${entityId}`);
        const result = await EntityLinkingService_js_1.default.suggestLinksForEntity(entityId, {
            limit: topK,
            investigationId,
            token: req.headers.authorization?.replace("Bearer ", ""),
        });
        const responseTime = Date.now() - startTime;
        if (!result.success) {
            return res.status(500).json({
                error: "Link prediction failed",
                message: result.error || result.message || "Unknown error",
            });
        }
        res.json({
            success: true,
            entityId,
            jobId: result.jobId,
            taskId: result.taskId,
            candidates: result.candidates,
            metadata: {
                model: result.modelName || "default_link_predictor",
                topK,
                executionTime: responseTime,
            },
        });
    }
    catch (error) {
        logger.error(`Error in link prediction: ${error instanceof Error ? error.message : "Unknown error"}`);
        res.status(500).json({
            error: "Link prediction failed",
            message: "Internal server error during link prediction",
        });
    }
});
/**
 * POST /api/ai/analyze-sentiment
 * Analyze sentiment of text content or entity data
 */
router.post("/analyze-sentiment", validateSentiment, handleValidationErrors, async (req, res) => {
    try {
        const startTime = Date.now();
        const { entityId, text, entityData } = req.body;
        logger.info(`Sentiment analysis request${entityId ? ` for entity: ${entityId}` : ""}`);
        let sentimentResult;
        if (text) {
            // Analyze single text
            sentimentResult = generateScaffoldSentiment(text);
        }
        else if (entityData) {
            // Analyze entity content
            sentimentResult = generateScaffoldEntitySentiment(entityData);
        }
        else {
            return res.status(400).json({
                error: "Invalid request",
                message: "Either text or entityData must be provided",
            });
        }
        const responseTime = Date.now() - startTime;
        logger.info(`Sentiment analysis completed in ${responseTime}ms`);
        res.json({
            success: true,
            entityId,
            sentiment: sentimentResult,
            metadata: {
                model: "scaffold-sentiment-v1",
                executionTime: responseTime,
                analyzedFields: sentimentResult.field_sentiments
                    ? Object.keys(sentimentResult.field_sentiments).length
                    : 1,
            },
        });
    }
    catch (error) {
        logger.error(`Error in sentiment analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
        res.status(500).json({
            error: "Sentiment analysis failed",
            message: "Internal server error during sentiment analysis",
        });
    }
});
/**
 * POST /api/ai/generate-summary
 * Generate AI-powered insights and summary for an entity
 */
router.post("/generate-summary", validateAISummary, handleValidationErrors, async (req, res) => {
    try {
        const startTime = Date.now();
        const { entityId, entityData, includeContext = true } = req.body;
        logger.info(`AI summary generation request for entity: ${entityId}`);
        // TODO: Replace with actual LLM integration
        const summary = generateScaffoldAISummary(entityId, entityData, includeContext);
        const responseTime = Date.now() - startTime;
        logger.info(`AI summary generated in ${responseTime}ms for entity ${entityId}`);
        res.json({
            success: true,
            entityId,
            summary,
            metadata: {
                model: "scaffold-llm-v1",
                includeContext,
                executionTime: responseTime,
                generatedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger.error(`Error in AI summary generation: ${error instanceof Error ? error.message : "Unknown error"}`);
        res.status(500).json({
            error: "AI summary generation failed",
            message: "Internal server error during summary generation",
        });
    }
});
/**
 * GET /api/ai/models/status
 * Get status and health of AI models
 */
router.get("/models/status", async (req, res) => {
    try {
        // TODO: Replace with actual model health checks
        const modelStatus = {
            linkPrediction: {
                status: "healthy",
                model: "scaffold-gnn-v1",
                lastUpdated: new Date().toISOString(),
                version: "1.0.0-scaffold",
            },
            sentimentAnalysis: {
                status: "healthy",
                model: "scaffold-sentiment-v1",
                lastUpdated: new Date().toISOString(),
                version: "1.0.0-scaffold",
            },
            textGeneration: {
                status: "healthy",
                model: "scaffold-llm-v1",
                lastUpdated: new Date().toISOString(),
                version: "1.0.0-scaffold",
            },
        };
        res.json({
            success: true,
            models: modelStatus,
            overview: {
                totalModels: Object.keys(modelStatus).length,
                healthyModels: Object.values(modelStatus).filter((m) => m.status === "healthy").length,
                lastChecked: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger.error(`Error checking model status: ${error instanceof Error ? error.message : "Unknown error"}`);
        res.status(500).json({
            error: "Model status check failed",
            message: "Internal server error during model status check",
        });
    }
});
/**
 * GET /api/ai/capabilities
 * Get available AI capabilities and their parameters
 */
router.get("/capabilities", async (req, res) => {
    try {
        const capabilities = {
            linkPrediction: {
                description: "Predict potential relationships between entities using graph neural networks",
                parameters: {
                    topK: { type: "integer", min: 1, max: 50, default: 10 },
                    threshold: { type: "float", min: 0, max: 1, default: 0.5 },
                },
                supportedEntityTypes: [
                    "person",
                    "organization",
                    "event",
                    "location",
                    "document",
                ],
                maxEntities: 1000,
            },
            sentimentAnalysis: {
                description: "Analyze sentiment of text content and entity descriptions",
                parameters: {
                    language: { type: "string", options: ["en"], default: "en" },
                },
                supportedFields: ["description", "notes", "comments", "content"],
                maxTextLength: 512,
            },
            textGeneration: {
                description: "Generate AI-powered insights and summaries for entities",
                parameters: {
                    includeContext: { type: "boolean", default: true },
                    maxLength: { type: "integer", min: 50, max: 1000, default: 200 },
                },
                supportedFormats: ["summary", "insights", "recommendations"],
            },
        };
        res.json({
            success: true,
            capabilities,
            version: "1.0.0-scaffold",
            lastUpdated: new Date().toISOString(),
        });
    }
    catch (error) {
        logger.error(`Error retrieving capabilities: ${error instanceof Error ? error.message : "Unknown error"}`);
        res.status(500).json({
            error: "Failed to retrieve capabilities",
            message: "Internal server error",
        });
    }
});
/**
 * POST /api/ai/extract-video
 * Submits a video for frame-by-frame AI extraction.
 */
router.post("/extract-video", validateExtractVideo, handleValidationErrors, async (req, res) => {
    const { mediaPath, mediaType, extractionMethods, options } = req.body;
    const jobId = (0, uuid_1.v4)(); // Generate a unique job ID
    try {
        // Add job to the queue
        await videoAnalysisQueue.add('video-analysis-job', {
            jobId,
            mediaPath,
            mediaType,
            extractionMethods,
            options,
        }, { jobId }); // Use jobId as BullMQ job ID for easy tracking
        logger.info(`Video analysis job ${jobId} submitted for ${mediaPath}`);
        res.status(202).json({
            success: true,
            jobId,
            message: "Video analysis job submitted successfully. Use /api/ai/job-status/:jobId to track progress.",
        });
    }
    catch (error) {
        logger.error(`Error submitting video analysis job: ${error.message}`, error);
        res.status(500).json({
            error: "Failed to submit video analysis job",
            message: error.message,
        });
    }
});
/**
 * GET /api/ai/job-status/:jobId
 * Get the status of an AI extraction job.
 */
router.get("/job-status/:jobId", async (req, res) => {
    const { jobId } = req.params;
    try {
        const job = await videoAnalysisQueue.getJob(jobId);
        if (!job) {
            return res.status(404).json({
                error: "Job not found",
                message: `Job with ID ${jobId} does not exist.`,
            });
        }
        const state = await job.getState();
        const result = job.returnvalue;
        const failedReason = job.failedReason;
        res.json({
            success: true,
            jobId,
            status: state,
            progress: job.progress,
            result: state === 'completed' ? result : undefined,
            error: state === 'failed' ? failedReason : undefined,
            createdAt: new Date(job.timestamp).toISOString(),
            processedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
        });
    }
    catch (error) {
        logger.error(`Error getting job status for ${jobId}: ${error.message}`, error);
        res.status(500).json({
            error: "Failed to retrieve job status",
            message: "Internal server error",
        });
    }
});
// Validation for feedback endpoint
const validateFeedback = [
    (0, express_validator_1.body)("insight").isObject().notEmpty().withMessage("insight object is required"),
    (0, express_validator_1.body)("feedbackType").isIn(['accept', 'reject', 'flag']).withMessage("feedbackType must be 'accept', 'reject', or 'flag'"),
    (0, express_validator_1.body)("user").isString().notEmpty().withMessage("user is required"),
    (0, express_validator_1.body)("timestamp").isISO8601().withMessage("timestamp must be a valid ISO 8601 date string"),
    (0, express_validator_1.body)("originalPrediction").isObject().notEmpty().withMessage("originalPrediction object is required"),
];
const validateDeceptionFeedback = [
    (0, express_validator_1.body)("text").isString().notEmpty().withMessage("text is required"),
    (0, express_validator_1.body)("label")
        .isIn(['false_positive', 'false_negative'])
        .withMessage("label must be 'false_positive' or 'false_negative'"),
    (0, express_validator_1.body)("user").isString().notEmpty().withMessage("user is required"),
    (0, express_validator_1.body)("timestamp").isISO8601().withMessage("timestamp must be a valid ISO 8601 date string"),
    (0, express_validator_1.body)("deceptionScore")
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage("deceptionScore must be between 0 and 1"),
];
/**
 * POST /api/ai/feedback
 * Logs user feedback on AI-generated insights for training signals.
 */
router.post("/feedback", validateFeedback, handleValidationErrors, async (req, res) => {
    try {
        const { insight, feedbackType, user, timestamp, originalPrediction } = req.body;
        logger.info("AI Feedback received:", { insight, feedbackType, user, timestamp, originalPrediction });
        // Add feedback to the queue for asynchronous processing by ML services
        await feedbackQueue.add('logFeedback', {
            insight,
            feedbackType,
            user,
            timestamp,
            originalPrediction,
        });
        res.status(200).json({
            success: true,
            message: "Feedback received successfully and queued for processing",
        });
    }
    catch (error) {
        logger.error(`Error processing feedback: ${error instanceof Error ? error.message : "Unknown error"}`);
        res.status(500).json({
            error: "Failed to process feedback",
            message: "Internal server error",
        });
    }
});
router.post("/feedback/deception", validateDeceptionFeedback, handleValidationErrors, async (req, res) => {
    try {
        const { text, label, user, timestamp, deceptionScore } = req.body;
        await feedbackQueue.add('logDeceptionFeedback', {
            insight: { text, deceptionScore },
            feedbackType: label,
            user,
            timestamp,
            originalPrediction: { deceptionScore },
        });
        res.status(200).json({ success: true, message: 'Feedback received' });
    }
    catch (error) {
        logger.error(`Error processing deception feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({ error: 'Failed to process feedback', message: 'Internal server error' });
    }
});
// Scaffold helper functions (replace with actual ML integration)
function generateScaffoldSentiment(text) {
    // Simple keyword-based scaffold sentiment
    const positiveWords = [
        "good",
        "great",
        "excellent",
        "positive",
        "happy",
        "success",
    ];
    const negativeWords = [
        "bad",
        "terrible",
        "poor",
        "negative",
        "sad",
        "failure",
    ];
    const textLower = text.toLowerCase();
    const positiveCount = positiveWords.filter((word) => textLower.includes(word)).length;
    const negativeCount = negativeWords.filter((word) => textLower.includes(word)).length;
    let sentiment = "neutral";
    let confidence = 0.7;
    if (positiveCount > negativeCount) {
        sentiment = "positive";
        confidence = Math.min(0.6 + positiveCount * 0.1, 0.95);
    }
    else if (negativeCount > positiveCount) {
        sentiment = "negative";
        confidence = Math.min(0.6 + negativeCount * 0.1, 0.95);
    }
    return {
        sentiment,
        confidence: parseFloat(confidence.toFixed(3)),
        scores: {
            positive: sentiment === "positive" ? confidence : (1 - confidence) * 0.4,
            negative: sentiment === "negative" ? confidence : (1 - confidence) * 0.4,
            neutral: sentiment === "neutral" ? confidence : (1 - confidence) * 0.2,
        },
        method: "scaffold",
    };
}
function generateScaffoldEntitySentiment(entityData) {
    const textFields = [];
    const fieldMap = {};
    // Extract text from entity
    if (entityData.description) {
        textFields.push(entityData.description);
        fieldMap[textFields.length - 1] = "description";
    }
    if (entityData.notes) {
        textFields.push(entityData.notes);
        fieldMap[textFields.length - 1] = "notes";
    }
    if (textFields.length === 0) {
        return {
            overall_sentiment: "neutral",
            overall_confidence: 0.0,
            field_sentiments: {},
            summary: "No text content found for analysis",
        };
    }
    const fieldSentiments = {};
    const sentimentScores = { positive: [], negative: [], neutral: [] };
    textFields.forEach((text, index) => {
        const result = generateScaffoldSentiment(text);
        const fieldName = fieldMap[index];
        fieldSentiments[fieldName] = result;
        // Collect for aggregation
        Object.entries(result.scores).forEach(([sentiment, score]) => {
            sentimentScores[sentiment].push(score);
        });
    });
    // Calculate overall sentiment
    const avgScores = {};
    Object.entries(sentimentScores).forEach(([sentiment, scores]) => {
        avgScores[sentiment] =
            scores.length > 0
                ? scores.reduce((a, b) => a + b, 0) / scores.length
                : 0;
    });
    const overallSentiment = Object.entries(avgScores).reduce((a, b) => avgScores[a[0]] > avgScores[b[0]] ? a : b)[0];
    const overallConfidence = avgScores[overallSentiment];
    return {
        overall_sentiment: overallSentiment,
        overall_confidence: parseFloat(overallConfidence.toFixed(3)),
        field_sentiments: fieldSentiments,
        summary: `Analyzed ${textFields.length} field(s). Overall sentiment: ${overallSentiment} (confidence: ${overallConfidence.toFixed(2)})`,
        analyzed_at: new Date().toISOString(),
    };
}
function generateScaffoldAISummary(entityId, entityData, includeContext) {
    const entityType = entityData?.type || "entity";
    const entityName = entityData?.name || entityId;
    const insights = [
        `${entityName} shows characteristics typical of ${entityType} entities`,
        "Scaffold analysis indicates normal behavior patterns",
        "No anomalies detected in current data set",
    ];
    const recommendations = [
        "Continue monitoring entity for changes",
        "Consider expanding data collection for deeper insights",
        "Review related entities for additional context",
    ];
    if (includeContext) {
        insights.push("Context analysis would provide additional insights when real ML models are integrated");
        recommendations.push("Implement context-aware analysis for enhanced predictions");
    }
    return {
        summary: `AI analysis of ${entityName}: This ${entityType} entity demonstrates standard patterns in the available data. Scaffold predictions suggest normal operational characteristics with no immediate concerns identified.`,
        insights,
        recommendations,
        confidence: 0.75,
        generatedBy: "scaffold-ai-v1",
        timestamp: new Date().toISOString(),
    };
}
const adversaryService = new AdversaryAgentService_js_1.default();
router.post('/adversary/generate', async (req, res) => {
    const { context, temperature, persistence } = req.body || {};
    if (!context) {
        return res.status(400).json({ error: 'context is required' });
    }
    try {
        const chain = await adversaryService.generateChain(context, { temperature, persistence });
        res.json({ ttps: chain });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=ai.js.map