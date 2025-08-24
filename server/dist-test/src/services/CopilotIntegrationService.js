"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotIntegrationService = void 0;
const axios_1 = __importDefault(require("axios"));
const mvp1_features_1 = require("../config/mvp1-features");
const MVP1RBACService_1 = require("./MVP1RBACService");
const logger = logger.child({ name: 'CopilotIntegrationService' });
class CopilotIntegrationService {
    constructor() {
        this.timeout = 30000; // 30 second timeout
        this.copilotBaseUrl = process.env.COPILOT_SERVICE_URL || 'http://localhost:8000';
        this.rbacService = new MVP1RBACService_1.MVP1RBACService();
    }
    /**
     * Extract named entities from text using Copilot service
     */
    async extractEntities(text, user, options = {}) {
        // Feature flag check
        if (!(0, mvp1_features_1.isFeatureEnabled)('COPILOT_SERVICE')) {
            throw new Error('Copilot service is not enabled');
        }
        // Permission check
        const hasPermission = await this.rbacService.hasPermission({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                isActive: true
            },
            action: MVP1RBACService_1.Permission.AI_QUERY
        });
        if (!hasPermission) {
            throw new Error('Insufficient permissions for AI query');
        }
        try {
            const startTime = Date.now();
            const requestPayload = {
                text,
                tenant_id: user.tenantId,
                investigation_id: options.investigationId,
                precision_threshold: options.precisionThreshold || 0.7,
                enable_caching: options.enableCaching !== false
            };
            logger.info('Requesting NER extraction from Copilot service', {
                textLength: text.length,
                tenantId: user.tenantId,
                userId: user.id
            });
            const response = await axios_1.default.post(`${this.copilotBaseUrl}/ner/extract`, requestPayload, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id,
                    'X-Tenant-ID': user.tenantId
                }
            });
            const result = response.data;
            // Log audit event
            await this.rbacService.recordAuditEvent({
                userId: user.id,
                userEmail: user.email,
                tenantId: user.tenantId,
                action: 'AI_NER_EXTRACT',
                resourceType: MVP1RBACService_1.ResourceType.SYSTEM,
                resourceData: {
                    textLength: text.length,
                    entitiesFound: result.entities.length,
                    confidence: result.confidence,
                    processingTime: result.processing_time_ms
                },
                success: true,
                investigationId: options.investigationId
            });
            logger.info('NER extraction completed', {
                entitiesFound: result.entities.length,
                confidence: result.confidence,
                processingTime: result.processing_time_ms,
                cached: result.cached
            });
            return result;
        }
        catch (error) {
            logger.error('Copilot NER extraction failed', {
                error: error.message,
                userId: user.id,
                tenantId: user.tenantId
            });
            // Log failed audit event
            await this.rbacService.recordAuditEvent({
                userId: user.id,
                userEmail: user.email,
                tenantId: user.tenantId,
                action: 'AI_NER_EXTRACT',
                resourceType: MVP1RBACService_1.ResourceType.SYSTEM,
                success: false,
                errorMessage: error.message,
                investigationId: options.investigationId
            });
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Copilot service is unavailable');
            }
            else if (error.response?.status === 422) {
                throw new Error(`Invalid request: ${error.response.data.detail}`);
            }
            else if (error.response?.status === 429) {
                throw new Error('Copilot service rate limit exceeded');
            }
            throw new Error(`Copilot service error: ${error.message}`);
        }
    }
    /**
     * Generate relationship suggestions between entities
     */
    async suggestRelationships(entities, user, investigationId, options = {}) {
        // Feature flag check
        if (!(0, mvp1_features_1.isFeatureEnabled)('COPILOT_SERVICE')) {
            throw new Error('Copilot service is not enabled');
        }
        // Permission check
        const hasPermission = await this.rbacService.hasPermission({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                isActive: true
            },
            action: MVP1RBACService_1.Permission.AI_SUGGEST,
            resource: {
                type: MVP1RBACService_1.ResourceType.INVESTIGATION,
                id: investigationId,
                tenantId: user.tenantId
            }
        });
        if (!hasPermission) {
            throw new Error('Insufficient permissions for AI suggestions');
        }
        try {
            const requestPayload = {
                entities,
                investigation_id: investigationId,
                tenant_id: user.tenantId,
                max_suggestions: options.maxSuggestions || 10,
                confidence_threshold: options.confidenceThreshold || 0.7
            };
            logger.info('Requesting link suggestions from Copilot service', {
                entityCount: entities.length,
                investigationId,
                tenantId: user.tenantId,
                userId: user.id
            });
            const response = await axios_1.default.post(`${this.copilotBaseUrl}/links/suggest`, requestPayload, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id,
                    'X-Tenant-ID': user.tenantId
                }
            });
            const result = response.data;
            // Log audit event
            await this.rbacService.recordAuditEvent({
                userId: user.id,
                userEmail: user.email,
                tenantId: user.tenantId,
                action: 'AI_LINK_SUGGEST',
                resourceType: MVP1RBACService_1.ResourceType.INVESTIGATION,
                resourceId: investigationId,
                resourceData: {
                    inputEntities: entities.length,
                    suggestionsGenerated: result.suggestions.length,
                    processingTime: result.processing_time_ms
                },
                success: true,
                investigationId
            });
            logger.info('Link suggestions completed', {
                suggestionsGenerated: result.suggestions.length,
                processingTime: result.processing_time_ms,
                graphEntitiesAnalyzed: result.graph_entities_analyzed
            });
            return result;
        }
        catch (error) {
            logger.error('Copilot link suggestions failed', {
                error: error.message,
                userId: user.id,
                tenantId: user.tenantId,
                investigationId
            });
            // Log failed audit event
            await this.rbacService.recordAuditEvent({
                userId: user.id,
                userEmail: user.email,
                tenantId: user.tenantId,
                action: 'AI_LINK_SUGGEST',
                resourceType: MVP1RBACService_1.ResourceType.INVESTIGATION,
                resourceId: investigationId,
                success: false,
                errorMessage: error.message,
                investigationId
            });
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Copilot service is unavailable');
            }
            else if (error.response?.status === 422) {
                throw new Error(`Invalid request: ${error.response.data.detail}`);
            }
            throw new Error(`Copilot service error: ${error.message}`);
        }
    }
    /**
     * Check Copilot service health
     */
    async healthCheck() {
        try {
            const startTime = Date.now();
            const response = await axios_1.default.get(`${this.copilotBaseUrl}/health`, {
                timeout: 5000 // Short timeout for health checks
            });
            const responseTime = Date.now() - startTime;
            return {
                status: 'healthy',
                available: true,
                response_time_ms: responseTime,
                version: response.data.version,
                models_loaded: response.data.models_loaded
            };
        }
        catch (error) {
            logger.warn('Copilot service health check failed', { error: error.message });
            return {
                status: 'unhealthy',
                available: false
            };
        }
    }
    /**
     * Convert Copilot entities to IntelGraph entity format
     */
    convertToIntelGraphEntities(copilotEntities, investigationId, tenantId, userId) {
        return copilotEntities.map(entity => ({
            type: entity.type,
            label: entity.label,
            description: `Extracted from text (${entity.start_index}-${entity.end_index})`,
            properties: {
                ...entity.suggested_properties,
                extractedFrom: 'copilot_ner',
                context: entity.context,
                startIndex: entity.start_index,
                endIndex: entity.end_index
            },
            confidence: entity.confidence,
            source: 'copilot_ai',
            investigationId,
            tenantId
        }));
    }
    /**
     * Batch process multiple texts for NER
     */
    async batchExtractEntities(texts, user, investigationId, options = {}) {
        const maxConcurrency = options.maxConcurrency || 3;
        const results = [];
        // Process in batches to avoid overwhelming the service
        for (let i = 0; i < texts.length; i += maxConcurrency) {
            const batch = texts.slice(i, i + maxConcurrency);
            const batchPromises = batch.map(async (text) => {
                try {
                    const result = await this.extractEntities(text, user, {
                        investigationId,
                        precisionThreshold: options.precisionThreshold
                    });
                    return { text, result, error: undefined };
                }
                catch (error) {
                    return { text, result: null, error: error.message };
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            // Small delay between batches to be respectful
            if (i + maxConcurrency < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        return results;
    }
}
exports.CopilotIntegrationService = CopilotIntegrationService;
exports.default = CopilotIntegrationService;
//# sourceMappingURL=CopilotIntegrationService.js.map