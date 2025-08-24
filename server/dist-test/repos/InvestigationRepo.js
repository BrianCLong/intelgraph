"use strict";
/**
 * Investigation Repository - Production persistence layer
 * Handles investigation/case management with PostgreSQL
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestigationRepo = void 0;
const uuid_1 = require("uuid");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const repoLogger = logger_js_1.default.child({ name: 'InvestigationRepo' });
class InvestigationRepo {
    constructor(pg) {
        this.pg = pg;
    }
    /**
     * Create new investigation
     */
    async create(input, userId) {
        const id = (0, uuid_1.v4)();
        const { rows } = await this.pg.query(`INSERT INTO investigations (id, tenant_id, name, description, status, props, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [
            id,
            input.tenantId,
            input.name,
            input.description || null,
            input.status || 'active',
            JSON.stringify(input.props || {}),
            userId
        ]);
        return this.mapRow(rows[0]);
    }
    /**
     * Update investigation
     */
    async update(input) {
        const updateFields = [];
        const params = [input.id];
        let paramIndex = 2;
        if (input.name !== undefined) {
            updateFields.push(`name = $${paramIndex}`);
            params.push(input.name);
            paramIndex++;
        }
        if (input.description !== undefined) {
            updateFields.push(`description = $${paramIndex}`);
            params.push(input.description);
            paramIndex++;
        }
        if (input.status !== undefined) {
            updateFields.push(`status = $${paramIndex}`);
            params.push(input.status);
            paramIndex++;
        }
        if (input.props !== undefined) {
            updateFields.push(`props = $${paramIndex}`);
            params.push(JSON.stringify(input.props));
            paramIndex++;
        }
        if (updateFields.length === 0) {
            return await this.findById(input.id);
        }
        updateFields.push(`updated_at = now()`);
        const { rows } = await this.pg.query(`UPDATE investigations SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`, params);
        return rows[0] ? this.mapRow(rows[0]) : null;
    }
    /**
     * Delete investigation (cascade to related entities)
     */
    async delete(id) {
        const client = await this.pg.connect();
        try {
            await client.query('BEGIN');
            // Note: In a full implementation, you might want to soft-delete
            // or handle related entities/relationships more carefully
            const { rowCount } = await client.query(`DELETE FROM investigations WHERE id = $1`, [id]);
            await client.query('COMMIT');
            return rowCount !== null && rowCount > 0;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Find investigation by ID
     */
    async findById(id, tenantId) {
        const params = [id];
        let query = `SELECT * FROM investigations WHERE id = $1`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const { rows } = await this.pg.query(query, params);
        return rows[0] ? this.mapRow(rows[0]) : null;
    }
    /**
     * List investigations with filters
     */
    async list({ tenantId, status, limit = 50, offset = 0 }) {
        const params = [tenantId];
        let query = `SELECT * FROM investigations WHERE tenant_id = $1`;
        let paramIndex = 2;
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Math.min(limit, 1000), offset);
        const { rows } = await this.pg.query(query, params);
        return rows.map(this.mapRow);
    }
    /**
     * Get investigation statistics
     */
    async getStats(investigationId, tenantId) {
        // This assumes you'll add investigation_id to entities/relationships tables
        // or implement a different association mechanism
        const entityQuery = `
      SELECT COUNT(*) as count 
      FROM entities 
      WHERE tenant_id = $1 AND props->>'investigationId' = $2
    `;
        const relationshipQuery = `
      SELECT COUNT(*) as count 
      FROM relationships 
      WHERE tenant_id = $1 AND props->>'investigationId' = $2
    `;
        const [entityResult, relationshipResult] = await Promise.all([
            this.pg.query(entityQuery, [tenantId, investigationId]),
            this.pg.query(relationshipQuery, [tenantId, investigationId])
        ]);
        return {
            entityCount: parseInt(entityResult.rows[0]?.count || '0'),
            relationshipCount: parseInt(relationshipResult.rows[0]?.count || '0')
        };
    }
    /**
     * Batch load investigations by IDs (for DataLoader)
     */
    async batchByIds(ids, tenantId) {
        if (ids.length === 0)
            return [];
        const params = [ids];
        let query = `SELECT * FROM investigations WHERE id = ANY($1)`;
        if (tenantId) {
            query += ` AND tenant_id = $2`;
            params.push(tenantId);
        }
        const { rows } = await this.pg.query(query, params);
        const investigationsMap = new Map(rows.map(row => [row.id, this.mapRow(row)]));
        return ids.map(id => investigationsMap.get(id) || null);
    }
    /**
     * Map database row to domain object
     */
    mapRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description || undefined,
            status: row.status,
            props: row.props,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by
        };
    }
}
exports.InvestigationRepo = InvestigationRepo;
//# sourceMappingURL=InvestigationRepo.js.map