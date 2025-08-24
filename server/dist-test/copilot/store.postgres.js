/**
 * IntelGraph Copilot Postgres Data Access Layer
 *
 * Provides durable persistence for Copilot runs, tasks, and events
 * with resume capability and proper idempotency handling.
 */
const { v4: uuid } = require('uuid');
class CopilotPostgresStore {
    constructor(pgClient) {
        this.pg = pgClient;
    }
    /**
     * Save a new Copilot run
     */
    async saveRun(run) {
        const query = `
      INSERT INTO copilot_runs (
        id, goal_id, goal_text, investigation_id, status, plan, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        plan = EXCLUDED.plan,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `;
        const values = [
            run.id,
            run.goalId || null,
            run.goalText || run.goal,
            run.investigationId || null,
            run.status,
            JSON.stringify(run.plan || {}),
            JSON.stringify(run.metadata || {}),
            run.createdAt || new Date().toISOString()
        ];
        const result = await this.pg.query(query, values);
        return this.mapRunFromDb(result.rows[0]);
    }
    /**
     * Get a Copilot run by ID
     */
    async getRun(id) {
        const query = `
      SELECT * FROM copilot_runs 
      WHERE id = $1
    `;
        const result = await this.pg.query(query, [id]);
        return result.rows.length > 0 ? this.mapRunFromDb(result.rows[0]) : null;
    }
    /**
     * Update run status and metadata
     */
    async updateRun(run) {
        const query = `
      UPDATE copilot_runs 
      SET 
        status = $2,
        plan = $3,
        metadata = $4,
        started_at = $5,
        finished_at = $6,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
        const values = [
            run.id,
            run.status,
            JSON.stringify(run.plan || {}),
            JSON.stringify(run.metadata || {}),
            run.startedAt || null,
            run.finishedAt || null
        ];
        const result = await this.pg.query(query, values);
        return result.rows.length > 0 ? this.mapRunFromDb(result.rows[0]) : null;
    }
    /**
     * Save a task with idempotency (run_id + sequence_number)
     */
    async saveTask(task) {
        const query = `
      INSERT INTO copilot_tasks (
        id, run_id, sequence_number, task_type, input_params, 
        output_data, status, error_message, started_at, finished_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (run_id, sequence_number) DO UPDATE SET
        status = EXCLUDED.status,
        output_data = EXCLUDED.output_data,
        error_message = EXCLUDED.error_message,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at
      RETURNING *
    `;
        const values = [
            task.id || uuid(),
            task.runId,
            task.sequenceNumber || task.seq,
            task.taskType || task.kind,
            JSON.stringify(task.inputParams || task.input || {}),
            JSON.stringify(task.outputData || task.output || {}),
            task.status,
            task.errorMessage || task.error || null,
            task.startedAt || null,
            task.finishedAt || null
        ];
        const result = await this.pg.query(query, values);
        return this.mapTaskFromDb(result.rows[0]);
    }
    /**
     * Get tasks for a run, ordered by sequence
     */
    async getTasksForRun(runId) {
        const query = `
      SELECT * FROM copilot_tasks 
      WHERE run_id = $1 
      ORDER BY sequence_number ASC
    `;
        const result = await this.pg.query(query, [runId]);
        return result.rows.map(row => this.mapTaskFromDb(row));
    }
    /**
     * Update task status with retry logic
     */
    async updateTask(task) {
        const query = `
      UPDATE copilot_tasks 
      SET 
        status = $2,
        output_data = $3,
        error_message = $4,
        started_at = $5,
        finished_at = $6
      WHERE id = $1
      RETURNING *
    `;
        const values = [
            task.id,
            task.status,
            JSON.stringify(task.outputData || task.output || {}),
            task.errorMessage || task.error || null,
            task.startedAt || null,
            task.finishedAt || null
        ];
        const result = await this.pg.query(query, values);
        return result.rows.length > 0 ? this.mapTaskFromDb(result.rows[0]) : null;
    }
    /**
     * Add an event to the run with streaming support
     */
    async pushEvent(runId, event) {
        const query = `
      INSERT INTO copilot_events (
        run_id, task_id, event_level, message, payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
        const values = [
            runId,
            event.taskId || null,
            (event.level || 'info').toLowerCase(),
            event.message,
            JSON.stringify(event.payload || {}),
            event.ts || new Date().toISOString()
        ];
        const result = await this.pg.query(query, values);
        return this.mapEventFromDb(result.rows[0]);
    }
    /**
     * Get events for a run with pagination
     */
    async listEvents(runId, options = {}) {
        const { afterId, limit = 50, level } = options;
        let query = `
      SELECT * FROM copilot_events 
      WHERE run_id = $1
    `;
        const params = [runId];
        let paramIndex = 2;
        if (afterId) {
            query += ` AND id > $${paramIndex}`;
            params.push(afterId);
            paramIndex++;
        }
        if (level) {
            query += ` AND event_level = $${paramIndex}`;
            params.push(level.toLowerCase());
            paramIndex++;
        }
        query += ` ORDER BY id ASC LIMIT $${paramIndex}`;
        params.push(limit);
        const result = await this.pg.query(query, params);
        return result.rows.map(row => this.mapEventFromDb(row));
    }
    /**
     * Find resumable runs (failed or paused)
     */
    async findResumableRuns(investigationId = null) {
        let query = `
      SELECT * FROM copilot_runs 
      WHERE status IN ('failed', 'paused')
    `;
        const params = [];
        if (investigationId) {
            query += ` AND investigation_id = $1`;
            params.push(investigationId);
        }
        query += ` ORDER BY created_at DESC`;
        const result = await this.pg.query(query, params);
        return result.rows.map(row => this.mapRunFromDb(row));
    }
    /**
     * Get run statistics for monitoring
     */
    async getRunStats(timeRange = '24 hours') {
        const query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_duration_seconds
      FROM copilot_runs 
      WHERE created_at >= NOW() - INTERVAL '${timeRange}'
      GROUP BY status
    `;
        const result = await this.pg.query(query);
        return result.rows;
    }
    /**
     * Clean up old events (retention policy)
     */
    async cleanupOldEvents(retentionDays = 30) {
        const query = `
      DELETE FROM copilot_events 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `;
        const result = await this.pg.query(query);
        return result.rowCount;
    }
    // Helper methods to map database rows to application objects
    mapRunFromDb(row) {
        if (!row)
            return null;
        return {
            id: row.id,
            goalId: row.goal_id,
            goalText: row.goal_text,
            goal: row.goal_text, // backwards compatibility
            investigationId: row.investigation_id,
            status: row.status,
            plan: typeof row.plan === 'string' ? JSON.parse(row.plan) : row.plan,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            startedAt: row.started_at,
            finishedAt: row.finished_at
        };
    }
    mapTaskFromDb(row) {
        if (!row)
            return null;
        return {
            id: row.id,
            runId: row.run_id,
            sequenceNumber: row.sequence_number,
            seq: row.sequence_number, // backwards compatibility
            taskType: row.task_type,
            kind: row.task_type, // backwards compatibility
            inputParams: typeof row.input_params === 'string' ? JSON.parse(row.input_params) : row.input_params,
            input: typeof row.input_params === 'string' ? JSON.parse(row.input_params) : row.input_params, // backwards compatibility
            outputData: typeof row.output_data === 'string' ? JSON.parse(row.output_data) : row.output_data,
            output: typeof row.output_data === 'string' ? JSON.parse(row.output_data) : row.output_data, // backwards compatibility
            status: row.status,
            errorMessage: row.error_message,
            error: row.error_message, // backwards compatibility
            createdAt: row.created_at,
            startedAt: row.started_at,
            finishedAt: row.finished_at
        };
    }
    mapEventFromDb(row) {
        if (!row)
            return null;
        return {
            id: row.id,
            runId: row.run_id,
            taskId: row.task_id,
            level: row.event_level,
            message: row.message,
            payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
            ts: row.created_at,
            createdAt: row.created_at
        };
    }
}
module.exports = CopilotPostgresStore;
//# sourceMappingURL=store.postgres.js.map