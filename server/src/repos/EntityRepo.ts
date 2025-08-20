/**
 * Entity Repository - Production persistence layer
 * Replaces demo resolvers with PostgreSQL (canonical) + Neo4j (graph) dual-write
 */

import { Pool, PoolClient } from 'pg';
import { Driver, Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

const repoLogger = logger.child({ name: 'EntityRepo' });

export interface Entity {
  id: string;
  tenantId: string;
  kind: string;
  labels: string[];
  props: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EntityInput {
  tenantId: string;
  kind: string;
  labels?: string[];
  props?: Record<string, any>;
}

export interface EntityUpdateInput {
  id: string;
  labels?: string[];
  props?: Record<string, any>;
}

interface EntityRow {
  id: string;
  tenant_id: string;
  kind: string;
  labels: string[];
  props: any;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export class EntityRepo {
  constructor(
    private pg: Pool,
    private neo4j: Driver
  ) {}

  /**
   * Create new entity with dual-write to PG (canonical) + Neo4j (graph)
   */
  async create(input: EntityInput, userId: string): Promise<Entity> {
    const id = uuidv4();
    const client = await this.pg.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Write to PostgreSQL (source of truth)
      const { rows } = await client.query<EntityRow>(
        `INSERT INTO entities (id, tenant_id, kind, labels, props, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, input.tenantId, input.kind, input.labels || [], JSON.stringify(input.props || {}), userId]
      );
      
      const entity = rows[0];
      
      // 2. Outbox event for Neo4j sync
      await client.query(
        `INSERT INTO outbox_events (id, topic, payload)
         VALUES ($1, $2, $3)`,
        [uuidv4(), 'entity.upsert', JSON.stringify({ id: entity.id, tenantId: entity.tenant_id })]
      );
      
      await client.query('COMMIT');
      
      // 3. Attempt immediate Neo4j write (best effort)
      try {
        await this.upsertNeo4jNode({
          id: entity.id,
          tenantId: entity.tenant_id,
          kind: entity.kind,
          labels: entity.labels,
          props: entity.props
        });
      } catch (neo4jError) {
        repoLogger.warn({ entityId: id, error: neo4jError }, 'Neo4j write failed, will retry via outbox');
      }
      
      return this.mapRow(entity);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update entity with dual-write
   */
  async update(input: EntityUpdateInput): Promise<Entity | null> {
    const client = await this.pg.connect();
    
    try {
      await client.query('BEGIN');
      
      const updateFields: string[] = [];
      const params: any[] = [input.id];
      let paramIndex = 2;
      
      if (input.labels !== undefined) {
        updateFields.push(`labels = $${paramIndex}`);
        params.push(input.labels);
        paramIndex++;
      }
      
      if (input.props !== undefined) {
        updateFields.push(`props = $${paramIndex}`);
        params.push(JSON.stringify(input.props));
        paramIndex++;
      }
      
      updateFields.push(`updated_at = now()`);
      
      const { rows } = await client.query<EntityRow>(
        `UPDATE entities SET ${updateFields.join(', ')}
         WHERE id = $1
         RETURNING *`,
        params
      );
      
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      
      const entity = rows[0];
      
      // Outbox event for Neo4j sync
      await client.query(
        `INSERT INTO outbox_events (id, topic, payload)
         VALUES ($1, $2, $3)`,
        [uuidv4(), 'entity.upsert', JSON.stringify({ id: entity.id, tenantId: entity.tenant_id })]
      );
      
      await client.query('COMMIT');
      
      // Best effort Neo4j update
      try {
        await this.upsertNeo4jNode({
          id: entity.id,
          tenantId: entity.tenant_id,
          kind: entity.kind,
          labels: entity.labels,
          props: entity.props
        });
      } catch (neo4jError) {
        repoLogger.warn({ entityId: input.id, error: neo4jError }, 'Neo4j update failed, will retry via outbox');
      }
      
      return this.mapRow(entity);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete entity with dual-write
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pg.connect();
    
    try {
      await client.query('BEGIN');
      
      const { rowCount } = await client.query(`DELETE FROM entities WHERE id = $1`, [id]);
      
      if (rowCount && rowCount > 0) {
        // Outbox event for Neo4j cleanup
        await client.query(
          `INSERT INTO outbox_events (id, topic, payload)
           VALUES ($1, $2, $3)`,
          [uuidv4(), 'entity.delete', JSON.stringify({ id })]
        );
        
        await client.query('COMMIT');
        
        // Best effort Neo4j delete
        try {
          await this.deleteNeo4jNode(id);
        } catch (neo4jError) {
          repoLogger.warn({ entityId: id, error: neo4jError }, 'Neo4j delete failed, will retry via outbox');
        }
        
        return true;
      } else {
        await client.query('ROLLBACK');
        return false;
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, tenantId?: string): Promise<Entity | null> {
    const params = [id];
    let query = `SELECT * FROM entities WHERE id = $1`;
    
    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    
    const { rows } = await this.pg.query<EntityRow>(query, params);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Search entities with filters
   */
  async search({
    tenantId,
    kind,
    props,
    limit = 100,
    offset = 0
  }: {
    tenantId: string;
    kind?: string;
    props?: Record<string, any>;
    limit?: number;
    offset?: number;
  }): Promise<Entity[]> {
    const params: any[] = [tenantId];
    let query = `SELECT * FROM entities WHERE tenant_id = $1`;
    let paramIndex = 2;
    
    if (kind) {
      query += ` AND kind = $${paramIndex}`;
      params.push(kind);
      paramIndex++;
    }
    
    if (props) {
      query += ` AND props @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify(props));
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Math.min(limit, 1000), offset); // Cap at 1000 for safety
    
    const { rows } = await this.pg.query<EntityRow>(query, params);
    return rows.map(this.mapRow);
  }

  /**
   * Batch load entities by IDs (for DataLoader)
   */
  async batchByIds(ids: readonly string[], tenantId?: string): Promise<(Entity | null)[]> {
    if (ids.length === 0) return [];
    
    const params = [ids];
    let query = `SELECT * FROM entities WHERE id = ANY($1)`;
    
    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    
    const { rows } = await this.pg.query<EntityRow>(query, params);
    const entitiesMap = new Map(rows.map(row => [row.id, this.mapRow(row)]));
    
    return ids.map(id => entitiesMap.get(id) || null);
  }

  /**
   * Upsert entity node in Neo4j (idempotent)
   */
  private async upsertNeo4jNode({
    id,
    tenantId,
    kind,
    labels,
    props
  }: {
    id: string;
    tenantId: string;
    kind: string;
    labels: string[];
    props: any;
  }): Promise<void> {
    const session = this.neo4j.session();
    
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (e:Entity {id: $id})
           ON CREATE SET e.createdAt = timestamp()
           SET e.tenantId = $tenantId,
               e.kind = $kind,
               e.labels = $labels,
               e.props = $props,
               e.updatedAt = timestamp()`,
          { id, tenantId, kind, labels, props }
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Delete entity node from Neo4j
   */
  private async deleteNeo4jNode(id: string): Promise<void> {
    const session = this.neo4j.session();
    
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (e:Entity {id: $id})
           DETACH DELETE e`,
          { id }
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Map database row to domain object
   */
  private mapRow(row: EntityRow): Entity {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      kind: row.kind,
      labels: row.labels,
      props: row.props,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}