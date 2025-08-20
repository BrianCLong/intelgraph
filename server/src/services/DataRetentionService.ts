import { Driver } from 'neo4j-driver';
import logger from '../config/logger';
import { writeAudit } from '../utils/audit'; // Assuming audit utility exists

const logger = logger.child({ name: 'DataRetentionService' });

interface RetentionPolicy {
  label: string; // Node or Relationship label
  ttlDays: number; // Time to live in days
  auditAction: string; // Audit action type (e.g., 'DATA_DELETED_TTL')
}

export class DataRetentionService {
  private neo4j: Driver;
  private policies: RetentionPolicy[];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(neo4jDriver: Driver) {
    this.neo4j = neo4jDriver;
    // Define default retention policies
    this.policies = [
      { label: 'Entity', ttlDays: Number(process.env.ENTITY_TTL_DAYS || 365), auditAction: 'ENTITY_DELETED_TTL' },
      { label: 'Relationship', ttlDays: Number(process.env.RELATIONSHIP_TTL_DAYS || 365), auditAction: 'RELATIONSHIP_DELETED_TTL' },
      // Add more policies as needed for other labels
    ];
  }

  public startCleanupJob(intervalMs: number = 24 * 60 * 60 * 1000) { // Default to every 24 hours
    if (this.cleanupInterval) {
      logger.warn('Data retention cleanup job already running. Stopping existing job.');
      this.stopCleanupJob();
    }

    logger.info(`Starting data retention cleanup job every ${intervalMs / (1000 * 60 * 60)} hours.`);
    this.cleanupInterval = setInterval(() => this.runCleanup(), intervalMs);
  }

  public stopCleanupJob() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Data retention cleanup job stopped.');
    }
  }

  private async runCleanup() {
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
          await writeAudit({
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
    } catch (error) {
      logger.error({ error }, 'Error during data retention cleanup.');
    } finally {
      await session.close();
    }
  }
}
