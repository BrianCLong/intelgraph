/**
 * Investigation Repository - Production persistence layer
 * Handles investigation/case management with PostgreSQL
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

const repoLogger = logger.child({ name: 'InvestigationRepo' });

export interface Investigation {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  props: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface InvestigationInput {
  tenantId: string;
  name: string;
  description?: string;
  status?: 'active' | 'archived' | 'completed';
  props?: Record<string, any>;
}

export interface InvestigationUpdateInput {
  id: string;
  name?: string;
  description?: string;
  status?: 'active' | 'archived' | 'completed';
  props?: Record<string, any>;
}

interface InvestigationRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: string;
  props: any;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export class InvestigationRepo {
  constructor(private pg: Pool) {}

  /**
   * Create new investigation
   */
  async create(input: InvestigationInput, userId: string): Promise<Investigation> {
    const id = uuidv4();
    
    const { rows } = await this.pg.query<InvestigationRow>(
      `INSERT INTO investigations (id, tenant_id, name, description, status, props, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        input.tenantId,
        input.name,
        input.description || null,
        input.status || 'active',
        JSON.stringify(input.props || {}),
        userId
      ]
    );
    
    return this.mapRow(rows[0]);
  }

  /**
   * Update investigation
   */
  async update(input: InvestigationUpdateInput): Promise<Investigation | null> {
    const updateFields: string[] = [];
    const params: any[] = [input.id];
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
    
    const { rows } = await this.pg.query<InvestigationRow>(
      `UPDATE investigations SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params
    );
    
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Delete investigation (cascade to related entities)
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pg.connect();
    
    try {
      await client.query('BEGIN');
      
      // Note: In a full implementation, you might want to soft-delete
      // or handle related entities/relationships more carefully
      const { rowCount } = await client.query(`DELETE FROM investigations WHERE id = $1`, [id]);
      
      await client.query('COMMIT');
      return rowCount !== null && rowCount > 0;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find investigation by ID
   */
  async findById(id: string, tenantId?: string): Promise<Investigation | null> {
    const params = [id];
    let query = `SELECT * FROM investigations WHERE id = $1`;
    
    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    
    const { rows } = await this.pg.query<InvestigationRow>(query, params);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * List investigations with filters
   */
  async list({
    tenantId,
    status,
    limit = 50,
    offset = 0
  }: {
    tenantId: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Investigation[]> {
    const params: any[] = [tenantId];
    let query = `SELECT * FROM investigations WHERE tenant_id = $1`;
    let paramIndex = 2;
    
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Math.min(limit, 1000), offset);
    
    const { rows } = await this.pg.query<InvestigationRow>(query, params);
    return rows.map(this.mapRow);
  }

  /**
   * Get investigation statistics
   */
  async getStats(investigationId: string, tenantId: string): Promise<{
    entityCount: number;
    relationshipCount: number;
  }> {
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
  async batchByIds(ids: readonly string[], tenantId?: string): Promise<(Investigation | null)[]> {
    if (ids.length === 0) return [];
    
    const params = [ids];
    let query = `SELECT * FROM investigations WHERE id = ANY($1)`;
    
    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    
    const { rows } = await this.pg.query<InvestigationRow>(query, params);
    const investigationsMap = new Map(rows.map(row => [row.id, this.mapRow(row)]));
    
    return ids.map(id => investigationsMap.get(id) || null);
  }

  /**
   * Map database row to domain object
   */
  private mapRow(row: InvestigationRow): Investigation {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description || undefined,
      status: row.status as 'active' | 'archived' | 'completed',
      props: row.props,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}