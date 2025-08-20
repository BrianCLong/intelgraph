/**
 * AI API Endpoints for IntelGraph
 * Provides endpoints for link prediction, sentiment analysis, and AI-powered insights
 */

import express, { Request, Response } from "express";
import { body, query, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import logger from '../config/logger';
import EntityLinkingService from "../services/EntityLinkingService.js";
import { Queue, QueueScheduler, Worker } from 'bullmq';
import { Job } from 'bullmq'; // Import Job type for better typing

import { ExtractionEngine } from '../ai/ExtractionEngine.js'; // WAR-GAMED SIMULATION - Import ExtractionEngine
import { ExtractionEngineConfig, ExtractionRequest, ExtractionResult } from '../ai/ExtractionEngine.js'; // WAR-GAMED SIMULATION - Import types
import { getNeo4jDriver } from '../db/neo4j.js'; // WAR-GAMED SIMULATION - For ExtractionEngine constructor
import { getRedisClient } from '../db/redis.js'; // WAR-GAMED SIMULATION - For BullMQ
import { Pool } from 'pg'; // WAR-GAMED SIMULATION - For ExtractionEngine constructor (assuming PG is used)
import { v4 as uuidv4 } from 'uuid'; // WAR-GAMED SIMULATION - For job IDs
import AdversaryAgentService from '../ai/services/AdversaryAgentService.js';
import { MediaType } from '../services/MultimodalDataService.js'; // WAR-GAMED SIMULATION - Import MediaType

const logger = logger.child({ name: 'aiRoutes' });
const router = express.Router();

// WAR-GAMED SIMULATION - BullMQ setup for video analysis jobs
const connection = getRedisClient(); // Use existing Redis client for BullMQ
const videoAnalysisQueue = new Queue('videoAnalysisQueue', { connection });
const videoAnalysisScheduler = new QueueScheduler('videoAnalysisQueue', { connection });

// Feedback Queue for AI insights
const feedbackQueue = new Queue('aiFeedbackQueue', { connection });

// WAR-GAMED SIMULATION - Initialize ExtractionEngine (assuming a dummy PG Pool for now)
// In a real app, the PG Pool would be passed from the main app initialization
const dummyPgPool = new Pool(); // WAR-GAMED SIMULATION - Placeholder
const extractionEngineConfig: ExtractionEngineConfig = {
  pythonPath: process.env.PYTHON_PATH || 'python', // Ensure this is configured
  modelsPath: process.env.MODELS_PATH || './models', // Ensure this is configured
  tempPath: process.env.TEMP_PATH || './temp', // Ensure this is configured
  maxConcurrentJobs: 5,
  enableGPU: process.env.ENABLE_GPU === 'true',
};
const extractionEngine = new ExtractionEngine(extractionEngineConfig, dummyPgPool);

// WAR-GAMED SIMULATION - Worker to process video analysis jobs
const videoAnalysisWorker = new Worker('videoAnalysisQueue', async (job) => {
  const { jobId, mediaPath, mediaType, extractionMethods, options } = job.data as ExtractionRequest;
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
  } catch (error: any) {
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
const aiRateLimit = rateLimit({
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
  body("entityId").isString().notEmpty().withMessage("entityId is required"),
  body("topK")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("topK must be between 1 and 50"),
];

const validateSentiment = [
  body("entityId")
    .optional()
    .isString()
    .withMessage("entityId must be a string"),
  body("text").optional().isString().withMessage("text must be a string"),
  body("entityData")
    .optional()
    .isObject()
    .withMessage("entityData must be an object"),
];

const validateAISummary = [
  body("entityId").isString().notEmpty().withMessage("entityId is required"),
  body("entityData")
    .optional()
    .isObject()
    .withMessage("entityData must be an object"),
  body("includeContext")
    .optional()
    .isBoolean()
    .withMessage("includeContext must be boolean"),
];

// WAR-GAMED SIMULATION - Validation for video extraction endpoint
const validateExtractVideo = [
  body("mediaPath").isString().notEmpty().withMessage("mediaPath is required"),
  body("mediaType").isIn([MediaType.VIDEO]).withMessage("mediaType must be VIDEO"),
  body("extractionMethods").isArray().withMessage("extractionMethods must be an array"),
  body("options").isObject().optional().withMessage("options must be an object"),
];

// Helper function to handle validation errors
const handleValidationErrors = (
  req: Request,
  res: Response,
  next: Function,
) => {
  const errors = validationResult(req);
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
router.post(
  "/predict-links",
  validatePredictLinks,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      const { entityId, topK = 10, investigationId } = req.body;

      logger.info(`Link prediction request for entity: ${entityId}`);

      const result = await EntityLinkingService.suggestLinksForEntity(
        entityId,
        {
          limit: topK,
          investigationId,
          token: req.headers.authorization?.replace("Bearer ", ""),
        },
      );

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
    } catch (error) {
      logger.error(
        `Error in link prediction: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      res.status(500).json({
        error: "Link prediction failed",
        message: "Internal server error during link prediction",
      });
    }
  },
);

/**
 * POST /api/ai/analyze-sentiment
 * Analyze sentiment of text content or entity data
 */
router.post(
  "/analyze-sentiment",
  validateSentiment,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      const { entityId, text, entityData } = req.body;

      logger.info(
        `Sentiment analysis request${entityId ? ` for entity: ${entityId}` : ""}`,
      );

      let sentimentResult;

      if (text) {
        // Analyze single text
        sentimentResult = generateScaffoldSentiment(text);
      } else if (entityData) {
        // Analyze entity content
        sentimentResult = generateScaffoldEntitySentiment(entityData);
      } else {
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
    } catch (error) {
      logger.error(
        `Error in sentiment analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      res.status(500).json({
        error: "Sentiment analysis failed",
        message: "Internal server error during sentiment analysis",
      });
    }
  },
);

/**
 * POST /api/ai/generate-summary
 * Generate AI-powered insights and summary for an entity
 */
router.post(
  "/generate-summary",
  validateAISummary,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      const { entityId, entityData, includeContext = true } = req.body;

      logger.info(`AI summary generation request for entity: ${entityId}`);

      // TODO: Replace with actual LLM integration
      const summary = generateScaffoldAISummary(
        entityId,
        entityData,
        includeContext,
      );

      const responseTime = Date.now() - startTime;

      logger.info(
        `AI summary generated in ${responseTime}ms for entity ${entityId}`,
      );

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
    } catch (error) {
      logger.error(
        `Error in AI summary generation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      res.status(500).json({
        error: "AI summary generation failed",
        message: "Internal server error during summary generation",
      });
    }
  },
);

/**
 * GET /api/ai/models/status
 * Get status and health of AI models
 */
router.get("/models/status", async (req: Request, res: Response) => {
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
        healthyModels: Object.values(modelStatus).filter(
          (m) => m.status === "healthy",
        ).length,
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(
      `Error checking model status: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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
router.get("/capabilities", async (req: Request, res: Response) => {
  try {
    const capabilities = {
      linkPrediction: {
        description:
          "Predict potential relationships between entities using graph neural networks",
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
        description:
          "Analyze sentiment of text content and entity descriptions",
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
  } catch (error) {
    logger.error(
      `Error retrieving capabilities: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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
router.post(
  "/extract-video",
  validateExtractVideo,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    const { mediaPath, mediaType, extractionMethods, options } = req.body;
    const jobId = uuidv4(); // Generate a unique job ID

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
    } catch (error: any) {
      logger.error(`Error submitting video analysis job: ${error.message}`, error);
      res.status(500).json({
        error: "Failed to submit video analysis job",
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/ai/job-status/:jobId
 * Get the status of an AI extraction job.
 */
router.get(
  "/job-status/:jobId",
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      logger.error(`Error getting job status for ${jobId}: ${error.message}`, error);
      res.status(500).json({
        error: "Failed to retrieve job status",
        message: "Internal server error",
      });
    }
  }
);

// Validation for feedback endpoint
const validateFeedback = [
  body("insight").isObject().notEmpty().withMessage("insight object is required"),
  body("feedbackType").isIn(['accept', 'reject', 'flag']).withMessage("feedbackType must be 'accept', 'reject', or 'flag'"),
  body("user").isString().notEmpty().withMessage("user is required"),
  body("timestamp").isISO8601().withMessage("timestamp must be a valid ISO 8601 date string"),
  body("originalPrediction").isObject().notEmpty().withMessage("originalPrediction object is required"),
];

const validateDeceptionFeedback = [
  body("text").isString().notEmpty().withMessage("text is required"),
  body("label")
    .isIn(['false_positive', 'false_negative'])
    .withMessage("label must be 'false_positive' or 'false_negative'"),
  body("user").isString().notEmpty().withMessage("user is required"),
  body("timestamp").isISO8601().withMessage("timestamp must be a valid ISO 8601 date string"),
  body("deceptionScore")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("deceptionScore must be between 0 and 1"),
];

/**
 * POST /api/ai/feedback
 * Logs user feedback on AI-generated insights for training signals.
 */
router.post(
  "/feedback",
  validateFeedback,
  handleValidationErrors,
  async (req: Request, res: Response) => {
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
    } catch (error) {
      logger.error(
        `Error processing feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      res.status(500).json({
        error: "Failed to process feedback",
        message: "Internal server error",
      });
    }
  },
);

router.post(
  "/feedback/deception",
  validateDeceptionFeedback,
  handleValidationErrors,
  async (req: Request, res: Response) => {
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
    } catch (error) {
      logger.error(
        `Error processing deception feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      res.status(500).json({ error: 'Failed to process feedback', message: 'Internal server error' });
    }
  },
);

// Scaffold helper functions (replace with actual ML integration)

function generateScaffoldSentiment(text: string) {
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
  const positiveCount = positiveWords.filter((word) =>
    textLower.includes(word),
  ).length;
  const negativeCount = negativeWords.filter((word) =>
    textLower.includes(word),
  ).length;

  let sentiment = "neutral";
  let confidence = 0.7;

  if (positiveCount > negativeCount) {
    sentiment = "positive";
    confidence = Math.min(0.6 + positiveCount * 0.1, 0.95);
  } else if (negativeCount > positiveCount) {
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

function generateScaffoldEntitySentiment(entityData: any) {
  const textFields = [];
  const fieldMap: Record<string, any> = {};

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

  const fieldSentiments: Record<string, any> = {};
  const sentimentScores = { positive: [], negative: [], neutral: [] };

  textFields.forEach((text, index) => {
    const result = generateScaffoldSentiment(text);
    const fieldName = fieldMap[index];
    fieldSentiments[fieldName] = result;

    // Collect for aggregation
    Object.entries(result.scores).forEach(([sentiment, score]) => {
      (sentimentScores as any)[sentiment].push(score);
    });
  });

  // Calculate overall sentiment
  const avgScores: Record<string, number> = {};
  Object.entries(sentimentScores).forEach(([sentiment, scores]) => {
    avgScores[sentiment] =
      scores.length > 0
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
        : 0;
  });

  const overallSentiment = Object.entries(avgScores).reduce((a, b) =>
    avgScores[a[0]] > avgScores[b[0]] ? a : b,
  )[0];
  const overallConfidence = avgScores[overallSentiment];

  return {
    overall_sentiment: overallSentiment,
    overall_confidence: parseFloat(overallConfidence.toFixed(3)),
    field_sentiments: fieldSentiments,
    summary: `Analyzed ${textFields.length} field(s). Overall sentiment: ${overallSentiment} (confidence: ${overallConfidence.toFixed(2)})`,
    analyzed_at: new Date().toISOString(),
  };
}

function generateScaffoldAISummary(
  entityId: string,
  entityData: any,
  includeContext: boolean,
) {
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
    insights.push(
      "Context analysis would provide additional insights when real ML models are integrated",
    );
    recommendations.push(
      "Implement context-aware analysis for enhanced predictions",
    );
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


const adversaryService = new AdversaryAgentService();

router.post('/adversary/generate', async (req: Request, res: Response) => {
  const { context, temperature, persistence } = req.body || {};
  if (!context) {
    return res.status(400).json({ error: 'context is required' });
  }
  try {
    const chain = await adversaryService.generateChain(context, { temperature, persistence });
    res.json({ ttps: chain });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
