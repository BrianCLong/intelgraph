"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAIAuditLogging = setupAIAuditLogging;
exports.auditAIOperation = auditAIOperation;
exports.auditJobCreation = auditJobCreation;
exports.auditJobCompletion = auditJobCompletion;
exports.auditInsightDecision = auditInsightDecision;
exports.auditMLModelUsage = auditMLModelUsage;
exports.auditSecurityEvent = auditSecurityEvent;
exports.auditDataAccess = auditDataAccess;
exports.auditWebhookReceived = auditWebhookReceived;
exports.auditConfigurationChange = auditConfigurationChange;
exports.getAuditTrail = getAuditTrail;
exports.getRecentSecurityEvents = getRecentSecurityEvents;
exports.generateAuditReport = generateAuditReport;
/**
 * Comprehensive audit logging for AI operations
 */
const uuid_1 = require("uuid");
let auditRepo = null;
function setupAIAuditLogging(db) {
    auditRepo = db.audit;
    console.log('AI audit logging initialized');
}
// Audit different types of AI operations
async function auditAIOperation(type, actorId, meta = {}) {
    if (!auditRepo)
        return;
    try {
        await auditRepo.insert({
            id: (0, uuid_1.v4)(),
            type,
            actorId,
            createdAt: new Date().toISOString(),
            meta: {
                ...meta,
                timestamp: Date.now(),
                service: 'intelgraph-ai'
            }
        });
    }
    catch (error) {
        console.error('Failed to audit AI operation:', error);
    }
}
// Specific audit functions for common operations
async function auditJobCreation(jobId, kind, userId, metadata = {}) {
    await auditAIOperation('AI_JOB_CREATED', userId, {
        jobId,
        kind,
        ...metadata
    });
}
async function auditJobCompletion(jobId, kind, status, processingTime, metadata = {}) {
    await auditAIOperation('AI_JOB_COMPLETED', 'ml-service', {
        jobId,
        kind,
        status,
        processingTimeMs: processingTime,
        ...metadata
    });
}
async function auditInsightDecision(insightId, decision, userId, reason) {
    await auditAIOperation('AI_INSIGHT_DECISION', userId, {
        insightId,
        decision,
        reason,
        timestamp: Date.now()
    });
}
async function auditMLModelUsage(modelName, taskType, userId, performanceMetrics = {}) {
    await auditAIOperation('AI_MODEL_USAGE', userId, {
        modelName,
        taskType,
        performanceMetrics,
        timestamp: Date.now()
    });
}
async function auditSecurityEvent(eventType, details, severity = 'medium') {
    await auditAIOperation('AI_SECURITY_EVENT', 'system', {
        eventType,
        severity,
        details,
        timestamp: Date.now()
    });
}
async function auditDataAccess(dataType, operation, userId, recordCount, details = {}) {
    await auditAIOperation('AI_DATA_ACCESS', userId, {
        dataType,
        operation,
        recordCount,
        details,
        timestamp: Date.now()
    });
}
async function auditWebhookReceived(jobId, kind, signature, ipAddress) {
    await auditAIOperation('AI_WEBHOOK_RECEIVED', 'ml-service', {
        jobId,
        kind,
        signaturePresent: !!signature,
        signatureValid: true, // This would be set by the webhook handler
        ipAddress,
        timestamp: Date.now()
    });
}
async function auditConfigurationChange(configType, userId, oldValue, newValue) {
    await auditAIOperation('AI_CONFIG_CHANGE', userId, {
        configType,
        oldValue,
        newValue,
        timestamp: Date.now()
    });
}
// Get audit trail for specific entities
async function getAuditTrail(entityType, entityId, limit = 100) {
    if (!auditRepo)
        return [];
    try {
        return await auditRepo.findByType(`AI_${entityType.toUpperCase()}_%`, limit);
    }
    catch (error) {
        console.error('Failed to get audit trail:', error);
        return [];
    }
}
// Get recent security events
async function getRecentSecurityEvents(hours = 24) {
    if (!auditRepo)
        return [];
    try {
        const events = await auditRepo.findRecent(hours);
        return events.filter((event) => event.type === 'AI_SECURITY_EVENT');
    }
    catch (error) {
        console.error('Failed to get recent security events:', error);
        return [];
    }
}
// Generate audit reports
async function generateAuditReport(startDate, endDate) {
    if (!auditRepo)
        return null;
    try {
        const events = await auditRepo.findRecent(24 * 7); // Last week
        const report = {
            period: { startDate, endDate },
            summary: {
                totalEvents: events.length,
                jobsCreated: events.filter((e) => e.type === 'AI_JOB_CREATED').length,
                jobsCompleted: events.filter((e) => e.type === 'AI_JOB_COMPLETED').length,
                insightDecisions: events.filter((e) => e.type === 'AI_INSIGHT_DECISION').length,
                securityEvents: events.filter((e) => e.type === 'AI_SECURITY_EVENT').length,
            },
            topUsers: getTopActors(events),
            securitySummary: getSecuritySummary(events),
            performanceMetrics: getPerformanceMetrics(events)
        };
        return report;
    }
    catch (error) {
        console.error('Failed to generate audit report:', error);
        return null;
    }
}
function getTopActors(events) {
    const actorCounts = {};
    events.forEach(event => {
        if (event.actor_id && event.actor_id !== 'system' && event.actor_id !== 'ml-service') {
            actorCounts[event.actor_id] = (actorCounts[event.actor_id] || 0) + 1;
        }
    });
    return Object.entries(actorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([actorId, count]) => ({ actorId, eventCount: count }));
}
function getSecuritySummary(events) {
    const securityEvents = events.filter(e => e.type === 'AI_SECURITY_EVENT');
    const severityCounts = {};
    securityEvents.forEach(event => {
        const severity = event.meta?.severity || 'unknown';
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    });
    return {
        totalSecurityEvents: securityEvents.length,
        severityBreakdown: severityCounts,
        recentCritical: securityEvents.filter(e => e.meta?.severity === 'critical').length
    };
}
function getPerformanceMetrics(events) {
    const jobCompletions = events.filter(e => e.type === 'AI_JOB_COMPLETED' && e.meta?.processingTimeMs);
    if (jobCompletions.length === 0) {
        return { averageProcessingTime: null, totalJobs: 0 };
    }
    const processingTimes = jobCompletions.map(e => e.meta.processingTimeMs);
    const average = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    return {
        averageProcessingTime: Math.round(average),
        totalJobs: jobCompletions.length,
        fastestJob: Math.min(...processingTimes),
        slowestJob: Math.max(...processingTimes)
    };
}
//# sourceMappingURL=auditLogging.js.map