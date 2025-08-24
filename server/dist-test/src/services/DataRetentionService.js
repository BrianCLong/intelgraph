"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRetentionService = void 0;
const audit_1 = require("../utils/audit"); // Assuming audit utility exists
const logger = logger.child({ name: 'DataRetentionService' });
class DataRetentionService {
    constructor(neo4jDriver) {
        this.cleanupInterval = null;
        this.neo4j = neo4jDriver;
        // Define default retention policies
        this.policies = [
            { label: 'Entity', ttlDays: Number(process.env.ENTITY_TTL_DAYS || 365), auditAction: 'ENTITY_DELETED_TTL' },
            { label: 'Relationship', ttlDays: Number(process.env.RELATIONSHIP_TTL_DAYS || 365), auditAction: 'RELATIONSHIP_DELETED_TTL' },
            // Add more policies as needed for other labels
        ];
    }
    startCleanupJob(intervalMs = 24 * 60 * 60 * 1000) {
        if (this.cleanupInterval) {
            logger.warn('Data retention cleanup job already running. Stopping existing job.');
            this.stopCleanupJob();
        }
        logger.info(`Starting data retention cleanup job every ${intervalMs / (1000 * 60 * 60)} hours.`);
        this.cleanupInterval = setInterval(() => this.runCleanup(), intervalMs);
    }
    stopCleanupJob() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger.info('Data retention cleanup job stopped.');
        }
    }
    async runCleanup() {
        logger.info('Running data retention cleanup...');
        const session = this.neo4j.session();
        try {
            for (const policy of this.policies) {
                const cutoffDate = new Date(Date.now() - policy.ttlDays * 24 * 60 * 60 * 1000);
                const cutoffTimestamp = cutoffDate.toISOString();
                const query = `
          MATCH (n:${policy.label})
          WHERE n.createdAt IS NOT NULL AND n.createdAt < datetime($cutoffTimestamp)
          WITH n LIMIT 1000 // Process in batches
          DETACH DELETE n
          RETURN count(n) as deletedCount
        `;
                const result = await session.run(query, { cutoffTimestamp });
                const deletedCount = result.records[0].get('deletedCount');
                if (deletedCount > 0) {
                    logger.info(`Deleted ${deletedCount} ${policy.label} nodes/relationships older than ${policy.ttlDays} days.`);
                    // Audit log the deletion
                    await (0, audit_1.writeAudit)({
                        userId: 'system', // System user for automated actions
                        action: policy.auditAction,
                        resourceType: policy.label,
                        resourceId: 'N/A', // Cannot log individual IDs for batch delete
                        details: { count: deletedCount, ttlDays: policy.ttlDays, cutoffDate: cutoffTimestamp },
                        ip: 'N/A',
                        userAgent: 'DataRetentionService',
                        actorRole: 'system',
                        sessionId: 'N/A',
                    });
                }
            }
        }
        catch (error) {
            logger.error({ error }, 'Error during data retention cleanup.');
        }
        finally {
            await session.close();
        }
    }
}
exports.DataRetentionService = DataRetentionService;
//# sourceMappingURL=DataRetentionService.js.map