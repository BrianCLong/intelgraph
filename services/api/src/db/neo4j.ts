/**
 * IntelGraph Neo4j Database Driver
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import neo4j, { Driver, Session, Transaction } from 'neo4j-driver';
import { logger } from '../utils/logger.js';

class Neo4jConnection {
  private driver: Driver | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.driver) {
      return;
    }

    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const username = process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
        maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 60000, // 60 seconds
        disableLosslessIntegers: true
      });

      // Verify connectivity
      await this.driver.verifyConnectivity();
      
      this.isConnected = true;
      logger.info({
        message: 'Neo4j connection established',
        uri: uri.replace(/\/\/.*@/, '//***@') // Hide credentials in logs
      });

      // Create constraints and indexes
      await this.createConstraintsAndIndexes();

    } catch (error) {
      logger.error({
        message: 'Failed to connect to Neo4j',
        error: error instanceof Error ? error.message : String(error),
        uri: uri.replace(/\/\/.*@/, '//***@')
      });
      throw error;
    }
  }

  private async createConstraintsAndIndexes(): Promise<void> {
    const session = this.getSession();
    
    try {
      // Entity constraints and indexes
      await session.run(`
        CREATE CONSTRAINT entity_id_unique IF NOT EXISTS 
        FOR (e:Entity) REQUIRE e.id IS UNIQUE
      `);
      
      await session.run(`
        CREATE CONSTRAINT entity_tenant_isolation IF NOT EXISTS 
        FOR (e:Entity) REQUIRE (e.id, e.tenantId) IS UNIQUE
      `);

      // Relationship constraints
      await session.run(`
        CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS 
        FOR ()-[r:RELATES_TO]-() REQUIRE r.id IS UNIQUE
      `);

      // Investigation constraints
      await session.run(`
        CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS 
        FOR (i:Investigation) REQUIRE i.id IS UNIQUE
      `);

      // Performance indexes
      await session.run(`
        CREATE INDEX entity_type_idx IF NOT EXISTS 
        FOR (e:Entity) ON (e.type)
      `);

      await session.run(`
        CREATE INDEX entity_tenant_idx IF NOT EXISTS 
        FOR (e:Entity) ON (e.tenantId)
      `);

      await session.run(`
        CREATE INDEX entity_created_at_idx IF NOT EXISTS 
        FOR (e:Entity) ON (e.createdAt)
      `);

      await session.run(`
        CREATE INDEX relationship_type_idx IF NOT EXISTS 
        FOR ()-[r:RELATES_TO]-() ON (r.type)
      `);

      await session.run(`
        CREATE INDEX relationship_confidence_idx IF NOT EXISTS 
        FOR ()-[r:RELATES_TO]-() ON (r.confidence)
      `);

      // Full-text search indexes
      await session.run(`
        CREATE FULLTEXT INDEX entity_search_idx IF NOT EXISTS 
        FOR (e:Entity) ON EACH [e.name, e.description]
      `);

      await session.run(`
        CREATE FULLTEXT INDEX investigation_search_idx IF NOT EXISTS 
        FOR (i:Investigation) ON EACH [i.name, i.description]
      `);

      logger.info('Neo4j constraints and indexes created successfully');

    } catch (error) {
      logger.error({
        message: 'Failed to create Neo4j constraints and indexes',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  getSession(database?: string): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }
    return this.driver.session({ database });
  }

  async executeQuery<T = any>(
    query: string, 
    parameters: Record<string, any> = {},
    database?: string
  ): Promise<T[]> {
    const session = this.getSession(database);
    
    try {
      const result = await session.run(query, parameters);
      return result.records.map(record => record.toObject());
    } catch (error) {
      logger.error({
        message: 'Neo4j query failed',
        query,
        parameters,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  async executeTransaction<T = any>(
    queries: Array<{ query: string; parameters?: Record<string, any> }>,
    database?: string
  ): Promise<T[]> {
    const session = this.getSession(database);
    
    try {
      const result = await session.executeWrite(async (tx: Transaction) => {
        const results = [];
        for (const { query, parameters = {} } of queries) {
          const queryResult = await tx.run(query, parameters);
          results.push(queryResult.records.map(record => record.toObject()));
        }
        return results;
      });
      
      return result.flat();
    } catch (error) {
      logger.error({
        message: 'Neo4j transaction failed',
        queries: queries.map(q => q.query),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  // Specialized methods for common graph operations
  async findShortestPath(
    sourceId: string,
    targetId: string,
    tenantId: string,
    maxDepth: number = 6,
    relationshipTypes?: string[]
  ): Promise<any[]> {
    const relationshipFilter = relationshipTypes 
      ? `:${relationshipTypes.join('|:')}` 
      : '';

    const query = `
      MATCH (source:Entity {id: $sourceId, tenantId: $tenantId}),
            (target:Entity {id: $targetId, tenantId: $tenantId})
      MATCH path = shortestPath((source)-[${relationshipFilter}*1..${maxDepth}]-(target))
      RETURN path
    `;

    return this.executeQuery(query, { sourceId, targetId, tenantId });
  }

  async findNeighbors(
    entityId: string,
    tenantId: string,
    depth: number = 1,
    direction: 'incoming' | 'outgoing' | 'both' = 'both'
  ): Promise<any[]> {
    const directionSymbol = {
      incoming: '<-',
      outgoing: '->',
      both: '-'
    }[direction];

    const query = `
      MATCH (entity:Entity {id: $entityId, tenantId: $tenantId})
      MATCH (entity)${directionSymbol}[r*1..${depth}]${directionSymbol}(neighbor:Entity {tenantId: $tenantId})
      RETURN DISTINCT neighbor, r
      ORDER BY neighbor.name
    `;

    return this.executeQuery(query, { entityId, tenantId });
  }

  async calculateCentrality(
    entityIds: string[],
    tenantId: string,
    algorithm: 'betweenness' | 'closeness' | 'degree' | 'pagerank' = 'pagerank'
  ): Promise<any[]> {
    // Note: This requires APOC procedures for advanced graph algorithms
    const query = `
      MATCH (e:Entity {tenantId: $tenantId})
      WHERE e.id IN $entityIds
      CALL apoc.algo.${algorithm}Centrality(
        'MATCH (n:Entity {tenantId: "${tenantId}"}) WHERE n.id IN $entityIds RETURN id(n) as id',
        'MATCH (n:Entity {tenantId: "${tenantId}"})-[r:RELATES_TO]-(m:Entity {tenantId: "${tenantId}"}) WHERE n.id IN $entityIds AND m.id IN $entityIds RETURN id(n) as source, id(m) as target',
        'both'
      )
      YIELD nodeId, score
      MATCH (n) WHERE id(n) = nodeId
      RETURN n.id as entityId, n.name as entityName, score
      ORDER BY score DESC
    `;

    return this.executeQuery(query, { entityIds, tenantId });
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.isConnected = false;
      logger.info('Neo4j connection closed');
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.driver) {
        return { status: 'disconnected' };
      }

      const session = this.getSession();
      const result = await session.run('RETURN 1 as health');
      await session.close();

      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          serverInfo: await this.driver.getServerInfo()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
}

// Export singleton instance
export const neo4jConnection = new Neo4jConnection();
export const neo4jDriver = neo4jConnection;

// Initialize connection on module load
neo4jConnection.connect().catch(error => {
  logger.error({
    message: 'Failed to initialize Neo4j connection',
    error: error instanceof Error ? error.message : String(error)
  });
});