"use strict";
/**
 * Outbox Neo4j Sync Worker
 * Handles eventual consistency between PostgreSQL and Neo4j
 * Processes outbox events with retry logic and idempotent operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxNeo4jSync = void 0;
const logger_js_1 = __importDefault(require("../config/logger.js"));
const workerLogger = logger_js_1.default.child({ name: 'OutboxNeo4jSync' });
class OutboxNeo4jSync {
    constructor(pg, neo4j, config = {}) {
        this.pg = pg;
        this.neo4j = neo4j;
        this.config = config;
        this.isRunning = false;
        this.config = {
            batchSize: 100,
            intervalMs: 2000,
            maxRetries: 10,
            backoffMultiplier: 2,
            ...config
        };
    }
    /**
     * Start the outbox worker
     */
    start() {
        if (this.isRunning) {
            workerLogger.warn('Outbox worker already running');
            return;
        }
        this.isRunning = true;
        workerLogger.info('Starting outbox worker', { config: this.config });
        this.intervalId = setInterval(() => {
            this.processOutboxBatch().catch(error => {
                workerLogger.error({ error }, 'Outbox batch processing failed');
            });
        }, this.config.intervalMs);
    }
    /**
     * Stop the outbox worker
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        workerLogger.info('Stopped outbox worker');
    }
    /**
     * Process a single batch of outbox events
     */
    async processOutboxBatch() {
        const client = await this.pg.connect();
        try {
            // Get unprocessed events with advisory lock to prevent concurrent processing
            const { rows } = await client.query(`SELECT id, topic, payload, created_at, attempts, last_error
         FROM outbox_events 
         WHERE processed_at IS NULL 
         AND attempts < $1
         ORDER BY created_at ASC 
         LIMIT $2
         FOR UPDATE SKIP LOCKED`, [this.config.maxRetries, this.config.batchSize]);
            if (rows.length === 0) {
                return;
            }
            workerLogger.debug(`Processing ${rows.length} outbox events`);
            // Process each event
            for (const event of rows) {
                await this.processEvent(client, event);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Process a single outbox event
     */
    async processEvent(client, event) {
        const eventLogger = workerLogger.child({
            eventId: event.id,
            topic: event.topic,
            attempts: event.attempts
        });
        try {
            eventLogger.debug('Processing outbox event');
            // Handle different event types
            switch (event.topic) {
                case 'entity.upsert':
                    await this.handleEntityUpsert(event.payload);
                    break;
                case 'entity.delete':
                    await this.handleEntityDelete(event.payload);
                    break;
                case 'relationship.upsert':
                    await this.handleRelationshipUpsert(event.payload);
                    break;
                case 'relationship.delete':
                    await this.handleRelationshipDelete(event.payload);
                    break;
                default:
                    eventLogger.warn(`Unknown event topic: ${event.topic}`);
                    // Mark as processed to avoid retry loop
                    await client.query(`UPDATE outbox_events SET processed_at = now() WHERE id = $1`, [event.id]);
                    return;
            }
            // Mark as successfully processed
            await client.query(`UPDATE outbox_events SET processed_at = now() WHERE id = $1`, [event.id]);
            eventLogger.debug('Event processed successfully');
        }
        catch (error) {
            const newAttempts = event.attempts + 1;
            const errorMessage = error.message || String(error);
            eventLogger.error({ error, newAttempts }, 'Event processing failed');
            // Update attempt count and error
            await client.query(`UPDATE outbox_events 
         SET attempts = $2, last_error = $3 
         WHERE id = $1`, [event.id, newAttempts, errorMessage]);
            // If max retries reached, log and continue (could implement DLQ here)
            if (newAttempts >= this.config.maxRetries) {
                eventLogger.error({ maxRetries: this.config.maxRetries }, 'Event exceeded max retries, will not retry again');
            }
        }
    }
    /**
     * Handle entity upsert event
     */
    async handleEntityUpsert(payload) {
        const { id, tenantId } = payload;
        // Fetch fresh entity data from PostgreSQL
        const { rows } = await this.pg.query(`SELECT id, tenant_id, kind, labels, props FROM entities WHERE id = $1`, [id]);
        if (rows.length === 0) {
            workerLogger.warn({ entityId: id }, 'Entity not found for upsert, may have been deleted');
            return;
        }
        const entity = rows[0];
        const session = this.neo4j.session();
        try {
            await session.executeWrite(async (tx) => {
                await tx.run(`MERGE (e:Entity {id: $id})
           ON CREATE SET e.createdAt = timestamp()
           SET e.tenantId = $tenantId,
               e.kind = $kind,
               e.labels = $labels,
               e.props = $props,
               e.updatedAt = timestamp()`, {
                    id: entity.id,
                    tenantId: entity.tenant_id,
                    kind: entity.kind,
                    labels: entity.labels,
                    props: entity.props
                });
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Handle entity delete event
     */
    async handleEntityDelete(payload) {
        const { id } = payload;
        const session = this.neo4j.session();
        try {
            await session.executeWrite(async (tx) => {
                await tx.run(`MATCH (e:Entity {id: $id})
           DETACH DELETE e`, { id });
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Handle relationship upsert event
     */
    async handleRelationshipUpsert(payload) {
        const { id, tenantId } = payload;
        // Fetch fresh relationship data from PostgreSQL
        const { rows } = await this.pg.query(`SELECT id, tenant_id, src_id, dst_id, type, props FROM relationships WHERE id = $1`, [id]);
        if (rows.length === 0) {
            workerLogger.warn({ relationshipId: id }, 'Relationship not found for upsert, may have been deleted');
            return;
        }
        const rel = rows[0];
        const session = this.neo4j.session();
        try {
            await session.executeWrite(async (tx) => {
                // First ensure both entities exist in Neo4j
                await tx.run(`MERGE (src:Entity {id: $srcId})
           MERGE (dst:Entity {id: $dstId})`, { srcId: rel.src_id, dstId: rel.dst_id });
                // Then create/update the relationship
                await tx.run(`MATCH (src:Entity {id: $srcId}), (dst:Entity {id: $dstId})
           MERGE (src)-[r:REL {id: $id}]->(dst)
           ON CREATE SET r.createdAt = timestamp()
           SET r.tenantId = $tenantId,
               r.type = $type,
               r.props = $props,
               r.updatedAt = timestamp()`, {
                    id: rel.id,
                    srcId: rel.src_id,
                    dstId: rel.dst_id,
                    tenantId: rel.tenant_id,
                    type: rel.type,
                    props: rel.props
                });
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Handle relationship delete event
     */
    async handleRelationshipDelete(payload) {
        const { id } = payload;
        const session = this.neo4j.session();
        try {
            await session.executeWrite(async (tx) => {
                await tx.run(`MATCH ()-[r:REL {id: $id}]-()
           DELETE r`, { id });
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get outbox statistics
     */
    async getStats() {
        const { rows } = await this.pg.query(`SELECT 
         COUNT(*) FILTER (WHERE processed_at IS NULL AND attempts < $1) as pending,
         COUNT(*) FILTER (WHERE processed_at IS NULL AND attempts >= $1) as failed,
         COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed
       FROM outbox_events`, [this.config.maxRetries]);
        return {
            pending: parseInt(rows[0]?.pending || '0'),
            failed: parseInt(rows[0]?.failed || '0'),
            processed: parseInt(rows[0]?.processed || '0')
        };
    }
    /**
     * Clean up old processed events
     */
    async cleanup(olderThanDays = 7) {
        const { rowCount } = await this.pg.query(`DELETE FROM outbox_events 
       WHERE processed_at IS NOT NULL 
       AND processed_at < now() - interval '${olderThanDays} days'`);
        const deletedCount = rowCount || 0;
        if (deletedCount > 0) {
            workerLogger.info({ deletedCount, olderThanDays }, 'Cleaned up old outbox events');
        }
        return deletedCount;
    }
}
exports.OutboxNeo4jSync = OutboxNeo4jSync;
//# sourceMappingURL=OutboxNeo4jSync.js.map