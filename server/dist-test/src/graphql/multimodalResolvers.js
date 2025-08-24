"use strict";
/**
 * Multimodal GraphQL Resolvers
 * P0 Critical - MVP1 requirement for cross-modal entity operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multimodalResolvers = void 0;
const MultimodalDataService_js_1 = __importDefault(require("../services/MultimodalDataService.js"));
exports.multimodalResolvers = {
    Query: {
        // Media Sources
        mediaSources: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.getMediaSources(args);
        },
        mediaSource: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.getMediaSource(args.id);
        },
        // Multimodal Entities
        multimodalEntities: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.getMultimodalEntities(args);
        },
        multimodalEntity: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.getMultimodalEntity(args.id);
        },
        // Cross-modal Matching
        findCrossModalMatches: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.findCrossModalMatches(args.entityId, args.targetMediaTypes);
        },
        // Extraction Jobs
        extractionJobs: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.getExtractionJobs(args);
        },
        extractionJob: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.getExtractionJob(args.id);
        },
        // Search and Analytics
        multimodalSearch: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.multimodalSearch(args.input);
        },
        semanticSearch: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.semanticSearch(args.input);
        },
        multimodalAnalytics: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.getMultimodalAnalytics(args.investigationId);
        },
        // Quality and Verification
        unverifiedEntities: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.getUnverifiedEntities(args);
        },
        duplicateEntities: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.findDuplicateEntities(args);
        }
    },
    Mutation: {
        // Media Upload and Management
        uploadMedia: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.uploadMediaSource(args.input, context.user.id);
        },
        deleteMediaSource: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.deleteMediaSource(args.id, context.user.id);
        },
        updateMediaMetadata: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.updateMediaMetadata(args.id, args.metadata, context.user.id);
        },
        // Entity Creation and Management
        createMultimodalEntity: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.createMultimodalEntity(args.input, context.user.id);
        },
        updateMultimodalEntity: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.updateMultimodalEntity(args.id, args.input, context.user.id);
        },
        verifyMultimodalEntity: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.verifyMultimodalEntity(args.id, args.verified, context.user.id);
        },
        mergeMultimodalEntities: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.mergeMultimodalEntities(args.primaryId, args.secondaryIds, context.user.id);
        },
        // Relationship Management
        createMultimodalRelationship: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.createMultimodalRelationship(args.input, context.user.id);
        },
        updateMultimodalRelationship: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.updateMultimodalRelationship(args.id, args.input, context.user.id);
        },
        verifyMultimodalRelationship: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.verifyMultimodalRelationship(args.id, args.verified, context.user.id);
        },
        // Processing Pipeline
        startExtractionJob: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.startExtractionJob(args.input, context.user.id);
        },
        cancelExtractionJob: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.cancelExtractionJob(args.id, context.user.id);
        },
        reprocessMedia: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.startExtractionJob({
                mediaSourceId: args.mediaSourceId,
                extractionMethods: args.extractionMethods,
                investigationId: args.investigationId,
                processingParams: { reprocess: true }
            }, context.user.id);
        },
        // Batch Operations
        batchUploadMedia: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            const results = [];
            for (const input of args.inputs) {
                try {
                    const result = await multimodalService.uploadMediaSource(input, context.user.id);
                    results.push(result);
                }
                catch (error) {
                    context.logger.error('Batch upload error:', error);
                    // Continue with other uploads
                }
            }
            return results;
        },
        batchExtractEntities: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            const jobs = [];
            for (const mediaSourceId of args.mediaSourceIds) {
                try {
                    const job = await multimodalService.startExtractionJob({
                        mediaSourceId,
                        extractionMethods: args.extractionMethods,
                        investigationId: args.investigationId
                    }, context.user.id);
                    jobs.push(job);
                }
                catch (error) {
                    context.logger.error('Batch extraction error:', error);
                    // Continue with other extractions
                }
            }
            return jobs;
        },
        // Cross-modal Operations
        generateCrossModalMatches: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.findCrossModalMatches(args.entityId, args.targetMediaTypes);
        },
        computeSemanticClusters: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.computeSemanticClusters(args.investigationId, args.algorithm);
        },
        // Quality and Cleanup
        validateExtractionResults: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.validateExtractionResults(args.jobId);
        },
        cleanupDuplicateEntities: async (parent, args, context) => {
            if (!context.user)
                throw new Error('Authentication required');
            const multimodalService = new MultimodalDataService_js_1.default(context.neo4jDriver, context.authService, context.storageService);
            return await multimodalService.cleanupDuplicateEntities(args.investigationId, args.similarity || 0.95, args.autoMerge || false, context.user.id);
        }
    },
    Subscription: {
        // Extraction Processing
        extractionJobUpdated: {
            subscribe: async (parent, args, context) => {
                if (!context.user)
                    throw new Error('Authentication required');
                // Return subscription for job updates
                return context.pubsub.asyncIterator([`EXTRACTION_JOB_UPDATED_${args.jobId}`]);
            },
            resolve: (event) => event.payload
        },
        extractionJobCompleted: {
            subscribe: async (parent, args, context) => {
                if (!context.user)
                    throw new Error('Authentication required');
                // Return subscription for completed jobs in investigation
                return context.pubsub.asyncIterator([`EXTRACTION_JOB_COMPLETED_${args.investigationId}`]);
            },
            resolve: (event) => event.payload
        },
        // Entity Updates
        multimodalEntityAdded: {
            subscribe: async (parent, args, context) => {
                if (!context.user)
                    throw new Error('Authentication required');
                return context.pubsub.asyncIterator([`MULTIMODAL_ENTITY_ADDED_${args.investigationId}`]);
            },
            resolve: (event) => event.payload
        },
        multimodalEntityUpdated: {
            subscribe: async (parent, args, context) => {
                if (!context.user)
                    throw new Error('Authentication required');
                return context.pubsub.asyncIterator([`MULTIMODAL_ENTITY_UPDATED_${args.investigationId}`]);
            },
            resolve: (event) => event.payload
        },
        multimodalEntityVerified: {
            subscribe: async (parent, args, context) => {
                if (!context.user)
                    throw new Error('Authentication required');
                return context.pubsub.asyncIterator([`MULTIMODAL_ENTITY_VERIFIED_${args.investigationId}`]);
            },
            resolve: (event) => event.payload
        },
        // Cross-modal Events
        crossModalMatchFound: {
            subscribe: async (parent, args, context) => {
                if (!context.user)
                    throw new Error('Authentication required');
                return context.pubsub.asyncIterator([`CROSS_MODAL_MATCH_FOUND_${args.investigationId}`]);
            },
            resolve: (event) => event.payload
        }
    },
    // Type Resolvers
    MultimodalEntity: {
        extractedFrom: async (parent, args, context) => {
            // Resolve media sources for this entity
            const session = context.neo4jDriver.session();
            try {
                const result = await session.run(`
          MATCH (e:MultimodalEntity {id: $entityId})-[:EXTRACTED_FROM]->(m:MediaSource)
          RETURN m
        `, { entityId: parent.id });
                return result.records.map(record => record.get('m').properties);
            }
            finally {
                await session.close();
            }
        },
        crossModalMatches: async (parent, args, context) => {
            // Resolve cross-modal matches for this entity
            const session = context.neo4jDriver.session();
            try {
                const result = await session.run(`
          MATCH (e:MultimodalEntity {id: $entityId})-[:HAS_CROSS_MODAL_MATCH]->(c:CrossModalMatch)
          RETURN c
        `, { entityId: parent.id });
                return result.records.map(record => record.get('c').properties);
            }
            finally {
                await session.close();
            }
        },
        relationships: async (parent, args, context) => {
            // Resolve multimodal relationships for this entity
            const session = context.neo4jDriver.session();
            try {
                const result = await session.run(`
          MATCH (e:MultimodalEntity {id: $entityId})-[r:MultimodalRelationship]-(other:MultimodalEntity)
          RETURN r, other
        `, { entityId: parent.id });
                return result.records.map(record => ({
                    ...record.get('r').properties,
                    sourceEntity: parent,
                    targetEntity: record.get('other').properties
                }));
            }
            finally {
                await session.close();
            }
        }
    },
    ExtractionJob: {
        results: async (parent, args, context) => {
            if (parent.status !== 'COMPLETED')
                return null;
            // Resolve extraction results
            const session = context.neo4jDriver.session();
            try {
                const result = await session.run(`
          MATCH (j:ExtractionJob {id: $jobId})-[:EXTRACTED]->(e:MultimodalEntity)
          OPTIONAL MATCH (j)-[:EXTRACTED]->(r:MultimodalRelationship)
          RETURN collect(DISTINCT e) as entities, collect(DISTINCT r) as relationships
        `, { jobId: parent.id });
                if (result.records.length === 0)
                    return null;
                const record = result.records[0];
                return {
                    entities: record.get('entities').map((e) => e.properties),
                    relationships: record.get('relationships').map((r) => r.properties),
                    summary: {
                        totalEntities: parent.entitiesExtracted,
                        totalRelationships: parent.relationshipsExtracted,
                        averageConfidence: 0.8, // Calculate from actual data
                        processingTime: parent.duration,
                        dataQualityScore: 0.85
                    },
                    qualityMetrics: {
                        overallScore: 0.85,
                        extractionAccuracy: 0.9,
                        crossModalConsistency: 0.8,
                        temporalConsistency: 0.85,
                        duplicateRate: 0.05,
                        verificationRate: 0.1
                    }
                };
            }
            finally {
                await session.close();
            }
        }
    }
};
exports.default = exports.multimodalResolvers;
//# sourceMappingURL=multimodalResolvers.js.map