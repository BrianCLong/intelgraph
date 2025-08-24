"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CopilotIntegrationService_1 = require("../../services/CopilotIntegrationService");
const apollo_server_express_1 = require("apollo-server-express");
const mvp1_features_1 = require("../../config/mvp1-features");
const copilotService = new CopilotIntegrationService_1.CopilotIntegrationService();
const mvp1CopilotResolvers = {
    Query: {
        // Get Copilot service health status
        copilotHealth: async (_, __, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new apollo_server_express_1.AuthenticationError('Authentication required');
            }
            try {
                const health = await copilotService.healthCheck();
                return {
                    status: health.status,
                    available: health.available,
                    responseTimeMs: health.response_time_ms,
                    version: health.version,
                    modelsLoaded: health.models_loaded
                };
            }
            catch (error) {
                throw new Error(`Failed to check Copilot health: ${error.message}`);
            }
        },
        // Get AI capabilities available to user
        aiCapabilities: async (_, __, context) => {
            if (!context.isAuthenticated || !context.user) {
                throw new apollo_server_express_1.AuthenticationError('Authentication required');
            }
            const capabilities = {
                nerExtraction: ['viewer', 'analyst', 'editor', 'investigator', 'admin', 'super_admin'].includes(context.user.role),
                linkSuggestions: ['analyst', 'editor', 'investigator', 'admin', 'super_admin'].includes(context.user.role),
                bulkProcessing: ['editor', 'investigator', 'admin', 'super_admin'].includes(context.user.role),
                adminFeatures: ['admin', 'super_admin'].includes(context.user.role)
            };
            return capabilities;
        }
    },
    Mutation: {
        // Extract named entities from text
        extractEntities: async (_, { input }, context) => {
            // Feature flag check
            if (!(0, mvp1_features_1.isFeatureEnabled)('COPILOT_SERVICE')) {
                throw new Error('Copilot service is not enabled');
            }
            if (!context.isAuthenticated || !context.user) {
                throw new apollo_server_express_1.AuthenticationError('Authentication required');
            }
            if (!input.text || input.text.trim().length === 0) {
                throw new apollo_server_express_1.UserInputError('Text is required for entity extraction');
            }
            if (input.text.length > 50000) {
                throw new apollo_server_express_1.UserInputError('Text exceeds maximum length of 50,000 characters');
            }
            try {
                const result = await copilotService.extractEntities(input.text, {
                    id: context.user.id,
                    email: context.user.email,
                    role: context.user.role,
                    tenantId: context.user.tenantId
                }, {
                    investigationId: input.investigationId,
                    precisionThreshold: input.precisionThreshold,
                    enableCaching: input.enableCaching
                });
                // Optionally auto-create entities in the graph
                let createdEntities = [];
                if (input.autoCreateEntities && input.investigationId && result.entities.length > 0) {
                    const intelGraphEntities = copilotService.convertToIntelGraphEntities(result.entities, input.investigationId, context.user.tenantId, context.user.id);
                    // TODO: Integrate with entity creation service
                    // createdEntities = await createEntitiesBatch(intelGraphEntities);
                }
                return {
                    success: true,
                    entities: result.entities.map(entity => ({
                        type: entity.type,
                        label: entity.label,
                        startIndex: entity.start_index,
                        endIndex: entity.end_index,
                        confidence: entity.confidence,
                        context: entity.context,
                        suggestedProperties: entity.suggested_properties
                    })),
                    confidence: result.confidence,
                    processingTimeMs: result.processing_time_ms,
                    cached: result.cached,
                    modelVersion: result.model_version,
                    createdEntities: createdEntities.length,
                    metadata: {
                        textLength: input.text.length,
                        entitiesFound: result.entities.length,
                        highConfidenceEntities: result.entities.filter(e => e.confidence >= 0.9).length
                    }
                };
            }
            catch (error) {
                throw new Error(`Entity extraction failed: ${error.message}`);
            }
        },
        // Generate relationship suggestions
        suggestRelationships: async (_, { input }, context) => {
            // Feature flag check
            if (!(0, mvp1_features_1.isFeatureEnabled)('COPILOT_SERVICE')) {
                throw new Error('Copilot service is not enabled');
            }
            if (!context.isAuthenticated || !context.user) {
                throw new apollo_server_express_1.AuthenticationError('Authentication required');
            }
            if (!input.entities || input.entities.length === 0) {
                throw new apollo_server_express_1.UserInputError('At least one entity is required for relationship suggestions');
            }
            if (!input.investigationId) {
                throw new apollo_server_express_1.UserInputError('Investigation ID is required for relationship suggestions');
            }
            try {
                // Convert input entities to Copilot format
                const copilotEntities = input.entities.map(entity => ({
                    type: entity.type,
                    label: entity.label,
                    start_index: entity.startIndex,
                    end_index: entity.endIndex,
                    confidence: entity.confidence,
                    context: entity.context,
                    suggested_properties: entity.suggestedProperties
                }));
                const result = await copilotService.suggestRelationships(copilotEntities, {
                    id: context.user.id,
                    email: context.user.email,
                    role: context.user.role,
                    tenantId: context.user.tenantId
                }, input.investigationId, {
                    maxSuggestions: input.maxSuggestions,
                    confidenceThreshold: input.confidenceThreshold
                });
                return {
                    success: true,
                    suggestions: result.suggestions.map(suggestion => ({
                        sourceEntity: suggestion.source_entity,
                        targetEntity: suggestion.target_entity,
                        relationshipType: suggestion.relationship_type,
                        confidence: suggestion.confidence,
                        reasoning: suggestion.reasoning,
                        evidence: suggestion.evidence
                    })),
                    processingTimeMs: result.processing_time_ms,
                    graphEntitiesAnalyzed: result.graph_entities_analyzed,
                    metadata: {
                        inputEntities: input.entities.length,
                        suggestionsGenerated: result.suggestions.length,
                        highConfidenceSuggestions: result.suggestions.filter(s => s.confidence >= 0.9).length
                    }
                };
            }
            catch (error) {
                throw new Error(`Relationship suggestion failed: ${error.message}`);
            }
        },
        // Bulk process multiple texts
        bulkExtractEntities: async (_, { input }, context) => {
            // Feature flag check
            if (!(0, mvp1_features_1.isFeatureEnabled)('COPILOT_SERVICE')) {
                throw new Error('Copilot service is not enabled');
            }
            if (!context.isAuthenticated || !context.user) {
                throw new apollo_server_express_1.AuthenticationError('Authentication required');
            }
            // Require elevated permissions for bulk processing
            if (!['editor', 'investigator', 'admin', 'super_admin'].includes(context.user.role)) {
                throw new apollo_server_express_1.ForbiddenError('Bulk processing requires Editor role or higher');
            }
            if (!input.texts || input.texts.length === 0) {
                throw new apollo_server_express_1.UserInputError('At least one text is required for bulk processing');
            }
            if (input.texts.length > 50) {
                throw new apollo_server_express_1.UserInputError('Maximum 50 texts allowed for bulk processing');
            }
            if (!input.investigationId) {
                throw new apollo_server_express_1.UserInputError('Investigation ID is required for bulk processing');
            }
            try {
                const results = await copilotService.batchExtractEntities(input.texts, {
                    id: context.user.id,
                    email: context.user.email,
                    role: context.user.role,
                    tenantId: context.user.tenantId
                }, input.investigationId, {
                    precisionThreshold: input.precisionThreshold,
                    maxConcurrency: input.maxConcurrency
                });
                const successful = results.filter(r => r.result !== null);
                const failed = results.filter(r => r.result === null);
                return {
                    success: failed.length === 0,
                    results: results.map(result => ({
                        text: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
                        success: result.result !== null,
                        entities: result.result?.entities.map(entity => ({
                            type: entity.type,
                            label: entity.label,
                            confidence: entity.confidence
                        })) || [],
                        confidence: result.result?.confidence || 0,
                        processingTimeMs: result.result?.processing_time_ms || 0,
                        error: result.error
                    })),
                    summary: {
                        totalTexts: input.texts.length,
                        successful: successful.length,
                        failed: failed.length,
                        totalEntities: successful.reduce((sum, r) => sum + (r.result?.entities.length || 0), 0),
                        averageConfidence: successful.length > 0
                            ? successful.reduce((sum, r) => sum + (r.result?.confidence || 0), 0) / successful.length
                            : 0
                    }
                };
            }
            catch (error) {
                throw new Error(`Bulk entity extraction failed: ${error.message}`);
            }
        }
    }
};
exports.default = mvp1CopilotResolvers;
//# sourceMappingURL=mvp1-copilot.js.map