/**
 * Relationship Repository - Production persistence layer
 * Handles relationships between entities with PostgreSQL + Neo4j dual-write
 */

import { Pool, PoolClient } from 'pg';
import { Driver, Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

const repoLogger = logger.child({ name: 'RelationshipRepo' });

export interface Relationship {
  id: string;
  tenantId: string;
  srcId: string;
  dstId: string;
  type: string;
  props: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RelationshipInput {
  tenantId: string;
  srcId: string;
  dstId: string;
  type: string;
  props?: Record<string, any>;
}

interface RelationshipRow {
  id: string;
  tenant_id: string;
  src_id: string;
  dst_id: string;
  type: string;
  props: any;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export class RelationshipRepo {
  constructor(
    private pg: Pool,
    private neo4j: Driver
  ) {}

  /**
   * Create new relationship with dual-write
   */
  async create(input: RelationshipInput, userId: string): Promise<Relationship> {
    const id = uuidv4();
    const client = await this.pg.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Verify both entities exist in PostgreSQL
      const { rows: srcCheck } = await client.query(
        `SELECT id FROM entities WHERE id = $1 AND tenant_id = $2`,
        [input.srcId, input.tenantId]
      );
      
      const { rows: dstCheck } = await client.query(
        `SELECT id FROM entities WHERE id = $1 AND tenant_id = $2`,
        [input.dstId, input.tenantId]
      );
      
      if (srcCheck.length === 0) {
        throw new Error(`Source entity ${input.srcId} not found`);
      }
      
      if (dstCheck.length === 0) {
        throw new Error(`Destination entity ${input.dstId} not found`);
      }
      
      // 2. Insert relationship
      const { rows } = await client.query<RelationshipRow>(
        `INSERT INTO relationships (id, tenant_id, src_id, dst_id, type, props, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [id, input.tenantId, input.srcId, input.dstId, input.type, JSON.stringify(input.props || {}), userId]
      );
      
      const relationship = rows[0];
      
      // 3. Outbox event for Neo4j sync
      await client.query(
        `INSERT INTO outbox_events (id, topic, payload)
         VALUES ($1, $2, $3)`,
        [uuidv4(), 'relationship.upsert', JSON.stringify({ id: relationship.id, tenantId: relationship.tenant_id })]
      );
      
      await client.query('COMMIT');
      
      // 4. Best effort Neo4j write
      try {
        await this.upsertNeo4jRelationship({
          id: relationship.id,
          tenantId: relationship.tenant_id,
          srcId: relationship.src_id,
          dstId: relationship.dst_id,
          type: relationship.type,
          props: relationship.props
        });
      } catch (neo4jError) {
        repoLogger.warn({ relationshipId: id, error: neo4jError }, 'Neo4j relationship write failed, will retry via outbox');
      }
      
      return this.mapRow(relationship);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete relationship with dual-write
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pg.connect();
    
    try {
      await client.query('BEGIN');
      
      const { rowCount } = await client.query(`DELETE FROM relationships WHERE id = $1`, [id]);
      
      if (rowCount && rowCount > 0) {
        // Outbox event for Neo4j cleanup
        await client.query(
          `INSERT INTO outbox_events (id, topic, payload)
           VALUES ($1, $2, $3)`,
          [uuidv4(), 'relationship.delete', JSON.stringify({ id })]
        );
        
        await client.query('COMMIT');
        
        // Best effort Neo4j delete
        try {
          await this.deleteNeo4jRelationship(id);
        } catch (neo4jError) {
          repoLogger.warn({ relationshipId: id, error: neo4jError }, 'Neo4j relationship delete failed, will retry via outbox');
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
   * Find relationship by ID
   */
  async findById(id: string, tenantId?: string): Promise<Relationship | null> {
    const params = [id];
    let query = `SELECT * FROM relationships WHERE id = $1`;
    
    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    
    const { rows } = await this.pg.query<RelationshipRow>(query, params);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Find relationships for an entity
   */
  async findByEntityId(entityId: string, tenantId: string, direction: 'incoming' | 'outgoing' | 'both' = 'both'): Promise<Relationship[]> {
    let query = `SELECT * FROM relationships WHERE tenant_id = $1 AND `;
    const params = [tenantId, entityId];
    
    if (direction === 'incoming') {
      query += `dst_id = $2`;
    } else if (direction === 'outgoing') {
      query += `src_id = $2`;
    } else {
      query += `(src_id = $2 OR dst_id = $2)`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const { rows } = await this.pg.query<RelationshipRow>(query, params);
    return rows.map(this.mapRow);
  }

  /**
   * Search relationships with filters
   */
  async search({
    tenantId,
    type,
    srcId,
    dstId,
    limit = 100,
    offset = 0
  }: {
    tenantId: string;
    type?: string;
    srcId?: string;
    dstId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Relationship[]> {
    const params: any[] = [tenantId];
    let query = `SELECT * FROM relationships WHERE tenant_id = $1`;
    let paramIndex = 2;
    
    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    if (srcId) {
      query += ` AND src_id = $${paramIndex}`;
      params.push(srcId);
      paramIndex++;
    }
    
    if (dstId) {
      query += ` AND dst_id = $${paramIndex}`;
      params.push(dstId);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Math.min(limit, 1000), offset);
    
    const { rows } = await this.pg.query<RelationshipRow>(query, params);
    return rows.map(this.mapRow);
  }

  /**
   * Get relationship count for an entity (for graph analysis)
   */
  async getEntityRelationshipCount(entityId: string, tenantId: string): Promise<{ incoming: number; outgoing: number }> {
    const { rows } = await this.pg.query(
      `SELECT 
         COUNT(*) FILTER (WHERE src_id = $2) as outgoing,
         COUNT(*) FILTER (WHERE dst_id = $2) as incoming
       FROM relationships 
       WHERE tenant_id = $1 AND (src_id = $2 OR dst_id = $2)`,
      [tenantId, entityId]
    );
    
    return {
      incoming: parseInt(rows[0]?.incoming || '0'),
      outgoing: parseInt(rows[0]?.outgoing || '0')
    };
  }

  /**
   * Upsert relationship in Neo4j (idempotent)
   */
  private async upsertNeo4jRelationship({
    id,
    tenantId,
    srcId,
    dstId,
    type,
    props
  }: {
    id: string;
    tenantId: string;
    srcId: string;
    dstId: string;
    type: string;
    props: any;
  }): Promise<void> {
    const session = this.neo4j.session();
    
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (src:Entity {id: $srcId}), (dst:Entity {id: $dstId})
           MERGE (src)-[r:REL {id: $id}]->(dst)
           ON CREATE SET r.createdAt = timestamp()
           SET r.tenantId = $tenantId,
               r.type = $type,
               r.props = $props,
               r.updatedAt = timestamp()`,
          { id, tenantId, srcId, dstId, type, props }
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Delete relationship from Neo4j
   */
  private async deleteNeo4jRelationship(id: string): Promise<void> {
    const session = this.neo4j.session();
    
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH ()-[r:REL {id: $id}]-()
           DELETE r`,
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
  private mapRow(row: RelationshipRow): Relationship {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      srcId: row.src_id,
      dstId: row.dst_id,
      type: row.type,
      props: row.props,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}