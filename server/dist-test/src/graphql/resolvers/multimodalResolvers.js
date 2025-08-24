"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multimodalResolvers = void 0;
const withAuthAndPolicy_js_1 = require("../../middleware/withAuthAndPolicy.js");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const logger = logger.child({ name: 'MultimodalResolvers' });
const pubsub = new graphql_subscriptions_1.PubSub();
exports.multimodalResolvers = {
    Query: {
        // Media Source queries
        mediaSource: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'media_source', id: args.id }))(async (_, { id }, context) => {
            return await context.multimodalDataService.getMediaSource(id);
        }),
        mediaSources: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'investigation', id: args.investigationId }))(async (_, { investigationId, mediaType, status, limit, offset }, context) => {
            return await context.multimodalDataService.getMediaSources(investigationId, {
                mediaType,
                status,
                limit,
                offset
            });
        }),
        // Multimodal Entity queries
        multimodalEntity: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'multimodal_entity', id: args.id }))(async (_, { id }, context) => {
            return await context.multimodalDataService.getMultimodalEntity(id);
        }),
        multimodalEntities: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'investigation', id: args.investigationId }))(async (_, { investigationId, mediaType, entityType, verified, confidenceLevel, limit, offset }, context) => {
            return await context.multimodalDataService.getMultimodalEntities(investigationId, {
                mediaType,
                entityType,
                verified,
                confidenceLevel,
                limit,
                offset
            });
        }),
        // Semantic Search
        semanticSearch: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'investigation', id: args.input.investigationId }))(async (_, { input }, context) => {
            return await context.multimodalDataService.semanticSearch(input.investigationId, {
                text: input.query,
                entityId: input.entityId,
                topK: input.topK,
                threshold: input.threshold,
                mediaTypes: input.mediaTypes,
                includeText: input.includeText
            });
        }),
        similarEntities: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'multimodal_entity', id: args.entityId }))(async (_, { entityId, topK, threshold }, context) => {
            return await context.multimodalDataService.findSimilarEntities(entityId, topK, threshold);
        }),
        // Extraction Job queries
        extractionJob: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'extraction_job', id: args.id }))(async (_, { id }, context) => {
            return await context.extractionJobService.getExtractionJob(id);
        }),
        extractionJobs: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'investigation', id: args.investigationId }))(async (_, { investigationId, status, limit, offset }, context) => {
            return await context.extractionJobService.getExtractionJobs(investigationId, {
                status,
                limit,
                offset
            });
        })
    },
    Mutation: {
        // Media Source management
        uploadMediaSource: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('create', (args) => ({ type: 'media_source', id: 'new' }))(async (_, { input, file }, context) => {
            try {
                let mediaMetadata;
                if (file) {
                    // Handle file upload
                    const upload = await file;
                    mediaMetadata = await context.mediaUploadService.uploadMedia(upload, context.user.id);
                }
                else if (input.uri) {
                    // Handle URI-based media (external files)
                    mediaMetadata = {
                        filename: input.uri,
                        originalName: input.filename || input.uri,
                        mimeType: input.mimeType,
                        filesize: 0,
                        checksum: `uri:${input.uri}`,
                        mediaType: input.mediaType,
                        metadata: input.metadata || {}
                    };
                }
                else {
                    throw new Error('Either file upload or URI must be provided');
                }
                const mediaSource = await context.multimodalDataService.createMediaSource(mediaMetadata, context.user.id, input.geospatialContext);
                logger.info(`Uploaded media source: ${mediaSource.id}, type: ${mediaSource.mediaType}`);
                return mediaSource;
            }
            catch (error) {
                logger.error('Failed to upload media source:', error);
                throw error;
            }
        }),
        updateMediaSource: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('update', (args) => ({ type: 'media_source', id: args.id }))(async (_, { id, input }, context) => {
            // Implementation for updating media source metadata
            throw new Error('updateMediaSource not yet implemented');
        }),
        deleteMediaSource: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('delete', (args) => ({ type: 'media_source', id: args.id }))(async (_, { id }, context) => {
            const mediaSource = await context.multimodalDataService.getMediaSource(id);
            if (!mediaSource) {
                throw new Error(`Media source ${id} not found`);
            }
            // Delete associated file if it exists
            try {
                await context.mediaUploadService.deleteMedia(mediaSource.filename);
            }
            catch (error) {
                logger.warn(`Failed to delete media file ${mediaSource.filename}:`, error);
            }
            // Delete from database (will cascade to related entities)
            // Implementation depends on your database service
            return true;
        }),
        // Multimodal Entity management
        createMultimodalEntity: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('create', (args) => ({ type: 'multimodal_entity', id: 'new' }))(async (_, { input }, context) => {
            const entity = await context.multimodalDataService.createMultimodalEntity(input, context.user.id);
            // Publish real-time update
            pubsub.publish(`MULTIMODAL_ENTITY_ADDED_${input.investigationId}`, {
                multimodalEntityAdded: entity
            });
            logger.info(`Created multimodal entity: ${entity.id}, type: ${entity.entityType}`);
            return entity;
        }),
        updateMultimodalEntity: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('update', (args) => ({ type: 'multimodal_entity', id: args.id }))(async (_, { id, input }, context) => {
            const entity = await context.multimodalDataService.updateMultimodalEntity(id, input);
            // Publish real-time update
            pubsub.publish(`MULTIMODAL_ENTITY_UPDATED_${entity.investigationId}`, {
                multimodalEntityUpdated: entity
            });
            logger.info(`Updated multimodal entity: ${id}`);
            return entity;
        }),
        verifyMultimodalEntity: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('update', (args) => ({ type: 'multimodal_entity', id: args.id }))(async (_, { id, verification }, context) => {
            const entity = await context.multimodalDataService.verifyMultimodalEntity(id, verification, context.user.id);
            // Publish real-time update
            pubsub.publish(`MULTIMODAL_ENTITY_VERIFIED_${entity.investigationId}`, {
                multimodalEntityVerified: entity
            });
            logger.info(`Verified multimodal entity: ${id}, verified: ${verification.verified}`);
            return entity;
        }),
        deleteMultimodalEntity: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('delete', (args) => ({ type: 'multimodal_entity', id: args.id }))(async (_, { id }, context) => {
            const deleted = await context.multimodalDataService.deleteMultimodalEntity(id);
            if (deleted) {
                logger.info(`Deleted multimodal entity: ${id}`);
            }
            return deleted;
        }),
        // Extraction Job management
        startExtractionJob: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('create', (args) => ({ type: 'extraction_job', id: 'new' }))(async (_, { input }, context) => {
            const job = await context.extractionJobService.startExtractionJob(input, context.user.id);
            // Publish real-time update
            pubsub.publish(`EXTRACTION_JOB_UPDATED_${job.id}`, {
                extractionJobUpdated: job
            });
            logger.info(`Started extraction job: ${job.id}, methods: ${input.extractionMethods.join(', ')}`);
            return job;
        }),
        cancelExtractionJob: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('update', (args) => ({ type: 'extraction_job', id: args.id }))(async (_, { id }, context) => {
            const job = await context.extractionJobService.cancelExtractionJob(id);
            // Publish real-time update
            pubsub.publish(`EXTRACTION_JOB_UPDATED_${id}`, {
                extractionJobUpdated: job
            });
            logger.info(`Cancelled extraction job: ${id}`);
            return job;
        }),
        retryExtractionJob: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('update', (args) => ({ type: 'extraction_job', id: args.id }))(async (_, { id }, context) => {
            const job = await context.extractionJobService.retryExtractionJob(id);
            // Publish real-time update
            pubsub.publish(`EXTRACTION_JOB_UPDATED_${id}`, {
                extractionJobUpdated: job
            });
            logger.info(`Retried extraction job: ${id}`);
            return job;
        }),
        // Batch Operations
        batchVerifyEntities: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('update', (args) => ({ type: 'investigation', id: 'batch' }))(async (_, { entityIds, verification }, context) => {
            const verifiedEntities = [];
            for (const entityId of entityIds) {
                try {
                    const entity = await context.multimodalDataService.verifyMultimodalEntity(entityId, verification, context.user.id);
                    verifiedEntities.push(entity);
                    // Publish individual updates
                    pubsub.publish(`MULTIMODAL_ENTITY_VERIFIED_${entity.investigationId}`, {
                        multimodalEntityVerified: entity
                    });
                }
                catch (error) {
                    logger.warn(`Failed to verify entity ${entityId}:`, error);
                }
            }
            logger.info(`Batch verified ${verifiedEntities.length}/${entityIds.length} entities`);
            return verifiedEntities;
        }),
        batchDeleteEntities: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('delete', (args) => ({ type: 'investigation', id: 'batch' }))(async (_, { entityIds }, context) => {
            let deletedCount = 0;
            for (const entityId of entityIds) {
                try {
                    const deleted = await context.multimodalDataService.deleteMultimodalEntity(entityId);
                    if (deleted)
                        deletedCount++;
                }
                catch (error) {
                    logger.warn(`Failed to delete entity ${entityId}:`, error);
                }
            }
            logger.info(`Batch deleted ${deletedCount}/${entityIds.length} entities`);
            return deletedCount === entityIds.length;
        })
    },
    Subscription: {
        // Real-time Job Updates
        extractionJobUpdated: {
            subscribe: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'extraction_job', id: args.jobId }))((_, { jobId }) => pubsub.asyncIterator(`EXTRACTION_JOB_UPDATED_${jobId}`)),
            resolve: (event) => event.payload
        },
        extractionJobCompleted: {
            subscribe: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'extraction_job', id: args.jobId }))((_, { jobId }) => pubsub.asyncIterator(`EXTRACTION_JOB_COMPLETED_${jobId}`)),
            resolve: (event) => event.payload
        },
        // Real-time Entity Updates
        multimodalEntityAdded: {
            subscribe: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'investigation', id: args.investigationId }))((_, { investigationId }) => pubsub.asyncIterator(`MULTIMODAL_ENTITY_ADDED_${investigationId}`)),
            resolve: (event) => event.payload
        },
        multimodalEntityVerified: {
            subscribe: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'investigation', id: args.investigationId }))((_, { investigationId }) => pubsub.asyncIterator(`MULTIMODAL_ENTITY_VERIFIED_${investigationId}`)),
            resolve: (event) => event.payload
        },
        multimodalEntityUpdated: {
            subscribe: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', (args) => ({ type: 'investigation', id: args.investigationId }))((_, { investigationId }) => pubsub.asyncIterator(`MULTIMODAL_ENTITY_UPDATED_${investigationId}`)),
            resolve: (event) => event.payload
        }
    },
    // Type resolvers for complex fields
    MediaSource: {
        // Add computed fields or nested resolvers here
        processingStatus: (parent) => parent.processingStatus,
        // Example: get related multimodal entities
        entities: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({ type: 'media_source', id: 'related' }))(async (parent, _, context) => {
            // This would fetch entities related to this media source
            // Implementation depends on your query requirements
            return [];
        })
    },
    MultimodalEntity: {
        // Resolve media source
        mediaSource: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({ type: 'media_source', id: 'related' }))(async (parent, _, context) => {
            return await context.multimodalDataService.getMediaSource(parent.mediaSourceId);
        }),
        // Resolve confidence level from confidence score
        confidenceLevel: (parent) => {
            if (parent.confidence >= 0.9)
                return 'VERY_HIGH';
            if (parent.confidence >= 0.7)
                return 'HIGH';
            if (parent.confidence >= 0.5)
                return 'MEDIUM';
            return 'LOW';
        },
        // Resolve bounding box
        boundingBox: (parent) => {
            if (parent.bboxX !== null && parent.bboxY !== null &&
                parent.bboxWidth !== null && parent.bboxHeight !== null) {
                return {
                    x: parent.bboxX,
                    y: parent.bboxY,
                    width: parent.bboxWidth,
                    height: parent.bboxHeight,
                    confidence: parent.bboxConfidence
                };
            }
            return null;
        },
        // Resolve temporal range
        temporalRange: (parent) => {
            if (parent.temporalStart !== null && parent.temporalEnd !== null) {
                return {
                    startTime: parent.temporalStart,
                    endTime: parent.temporalEnd,
                    confidence: parent.temporalConfidence
                };
            }
            return null;
        },
        // Get related entities (cross-modal matches, etc.)
        relatedEntities: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({ type: 'multimodal_entity', id: 'related' }))(async (parent, _, context) => {
            return await context.multimodalDataService.findSimilarEntities(parent.id, 5, 0.7);
        })
    },
    ExtractionJob: {
        // Resolve media source
        mediaSource: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({ type: 'media_source', id: 'related' }))(async (parent, _, context) => {
            return await context.multimodalDataService.getMediaSource(parent.mediaSourceId);
        }),
        // Resolve extracted entities
        results: (0, withAuthAndPolicy_js_1.withAuthAndPolicy)('read', () => ({ type: 'extraction_job', id: 'results' }))(async (parent, _, context) => {
            return await context.multimodalDataService.getMultimodalEntities(parent.investigationId, {
                // Filter by entities created by this job (would need job tracking in entities)
                limit: 1000
            });
        }),
        // Parse metrics JSON
        metrics: (parent) => {
            try {
                return typeof parent.processingMetrics === 'string'
                    ? JSON.parse(parent.processingMetrics)
                    : parent.processingMetrics;
            }
            catch {
                return {};
            }
        }
    },
    // Scalar resolvers
    Upload: require('graphql-upload-ts').GraphQLUpload
};
exports.default = exports.multimodalResolvers;
//# sourceMappingURL=multimodalResolvers.js.map