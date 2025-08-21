/**
 * Tenant-Aware Database Service
 * Provides database operations with automatic tenant isolation
 */

import neo4j, { Driver, Session, Transaction } from 'neo4j-driver';
import { Pool } from 'pg';
import Redis from 'ioredis';
import logger from '../config/logger';
import { TenantContext, TenantValidator } from '../middleware/tenantValidator.js';
import { getTenantConfig, getConfigVersion } from '../config/tenant-database.js';

const logger = logger.child({ name: 'tenantDatabase' });

export interface DatabaseConfig {
  neo4j?: Driver;
  postgres?: Pool;
  redis?: Redis;
}

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

/**
 * Tenant-aware database service with automatic isolation
 */
export class TenantDatabase {
  private neo4j?: Driver;
  private postgres?: Pool;
  private redis?: Redis;
  private redisPrefix: string;

  private static pgPools: Map<string, Pool> = new Map();
  private static neo4jDrivers: Map<string, Driver> = new Map();
  private static configVersion = 0;

  constructor(config: DatabaseConfig, redisPrefix = '') {
    this.neo4j = config.neo4j;
    this.postgres = config.postgres;
    this.redis = config.redis;
    this.redisPrefix = redisPrefix;
  }

  static async forTenant(tenantId: string, redis?: Redis): Promise<TenantDatabase> {
    const version = getConfigVersion();
    if (version !== this.configVersion) {
      await this.clearCaches();
      this.configVersion = version;
    }

    const cfg = getTenantConfig(tenantId);
    if (!cfg) {
      throw new Error(`No database configuration for tenant ${tenantId}`);
    }

    let pg = this.pgPools.get(tenantId);
    if (!pg) {
      pg = new Pool(cfg.postgres);
      this.pgPools.set(tenantId, pg);
    }

    let driver = this.neo4jDrivers.get(tenantId);
    if (!driver) {
      driver = neo4j.driver(cfg.neo4j.uri, neo4j.auth.basic(cfg.neo4j.username, cfg.neo4j.password));
      this.neo4jDrivers.set(tenantId, driver);
    }

    return new TenantDatabase({ postgres: pg, neo4j: driver, redis }, cfg.redisPrefix || `tenant:${tenantId}`);
  }

  private static async clearCaches() {
    for (const pool of this.pgPools.values()) {
      try { await pool.end(); } catch {}
    }
    this.pgPools.clear();
    for (const driver of this.neo4jDrivers.values()) {
      try { await driver.close(); } catch {}
    }
    this.neo4jDrivers.clear();
  }

  /**
   * Execute Neo4j query with tenant isolation
   */
  async executeNeo4jQuery(
    cypherQuery: string,
    parameters: Record<string, any>,
    tenantContext: TenantContext,
    options: QueryOptions = {}
  ): Promise<any> {
    if (!this.neo4j) {
      throw new Error('Neo4j driver not configured');
    }

    const { cacheEnabled = true, cacheTTL = 300 } = options;
    
    // Generate cache key for this query
    const cacheKey = cacheEnabled ? this.generateCacheKey(cypherQuery, parameters, tenantContext) : null;
    
    // Check cache first
    if (cacheKey && this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for tenant ${tenantContext.tenantId}: ${cacheKey}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(`Cache read failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Enhance query with tenant constraints
    const { query: enhancedQuery, parameters: enhancedParams } = 
      TenantValidator.addTenantToNeo4jQuery(cypherQuery, parameters, tenantContext);

    const session = this.neo4j.session();
    
    try {
      logger.debug(`Executing Neo4j query for tenant ${tenantContext.tenantId}: ${enhancedQuery}`);
      
      const result = await session.run(enhancedQuery, enhancedParams);
      const records = result.records.map(record => record.toObject());
      
      // Cache successful results
      if (cacheKey && this.redis && records.length > 0) {
        try {
          await this.redis.setex(cacheKey, cacheTTL, JSON.stringify(records));
          logger.debug(`Cached result for tenant ${tenantContext.tenantId}: ${cacheKey}`);
        } catch (error) {
          logger.warn(`Cache write failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return records;
      
    } catch (error) {
      logger.error(`Neo4j query failed for tenant ${tenantContext.tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute PostgreSQL query with tenant isolation
   */
  async executePostgresQuery(
    sqlQuery: string,
    parameters: any[],
    tenantContext: TenantContext,
    options: QueryOptions = {}
  ): Promise<any> {
    if (!this.postgres) {
      throw new Error('PostgreSQL pool not configured');
    }

    const { cacheEnabled = true, cacheTTL = 300 } = options;
    
    // Generate cache key for this query
    const cacheKey = cacheEnabled ? this.generateCacheKey(sqlQuery, parameters, tenantContext) : null;
    
    // Check cache first
    if (cacheKey && this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for tenant ${tenantContext.tenantId}: ${cacheKey}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(`Cache read failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Enhance query with tenant constraints
    const { query: enhancedQuery, parameters: enhancedParams } = 
      this.addTenantToPostgresQuery(sqlQuery, parameters, tenantContext);

    const client = await this.postgres.connect();
    
    try {
      logger.debug(`Executing PostgreSQL query for tenant ${tenantContext.tenantId}: ${enhancedQuery}`);
      
      const result = await client.query(enhancedQuery, enhancedParams);
      
      // Cache successful results
      if (cacheKey && this.redis && result.rows.length > 0) {
        try {
          await this.redis.setex(cacheKey, cacheTTL, JSON.stringify(result.rows));
          logger.debug(`Cached result for tenant ${tenantContext.tenantId}: ${cacheKey}`);
        } catch (error) {
          logger.warn(`Cache write failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return result.rows;
      
    } catch (error) {
      logger.error(`PostgreSQL query failed for tenant ${tenantContext.tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get data from cache with tenant isolation
   */
  async getCached(
    key: string,
    tenantContext: TenantContext,
    scope: 'tenant' | 'global' | 'user' = 'tenant'
  ): Promise<any | null> {
    if (!this.redis) {
      return null;
    }

    const tenantKey = TenantValidator.getTenantCacheKey(key, tenantContext, scope);
    
    try {
      const cached = await this.redis.get(tenantKey);
      if (cached) {
        logger.debug(`Cache hit for tenant ${tenantContext.tenantId}: ${tenantKey}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.warn(`Cache read failed for tenant ${tenantContext.tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Set data in cache with tenant isolation
   */
  async setCached(
    key: string,
    data: any,
    tenantContext: TenantContext,
    ttl: number = 300,
    scope: 'tenant' | 'global' | 'user' = 'tenant'
  ): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    const tenantKey = TenantValidator.getTenantCacheKey(key, tenantContext, scope);
    
    try {
      await this.redis.setex(tenantKey, ttl, JSON.stringify(data));
      logger.debug(`Cached data for tenant ${tenantContext.tenantId}: ${tenantKey}`);
      return true;
    } catch (error) {
      logger.warn(`Cache write failed for tenant ${tenantContext.tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Invalidate cache for tenant
   */
  async invalidateTenantCache(
    pattern: string,
    tenantContext: TenantContext,
    scope: 'tenant' | 'global' | 'user' = 'tenant'
  ): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    const tenantPattern = TenantValidator.getTenantCacheKey(pattern, tenantContext, scope);
    
    try {
      const keys = await this.redis.keys(tenantPattern);
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        logger.info(`Invalidated ${deleted} cache keys for tenant ${tenantContext.tenantId}: ${tenantPattern}`);
        return deleted;
      }
      return 0;
    } catch (error) {
      logger.warn(`Cache invalidation failed for tenant ${tenantContext.tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  /**
   * Execute transaction with tenant isolation
   */
  async executeTransaction(
    operations: Array<{
      type: 'neo4j' | 'postgres';
      query: string;
      parameters: any;
    }>,
    tenantContext: TenantContext
  ): Promise<any[]> {
    const results: any[] = [];
    
    // Group operations by database type
    const neo4jOps = operations.filter(op => op.type === 'neo4j');
    const postgresOps = operations.filter(op => op.type === 'postgres');
    
    // Execute Neo4j operations in transaction
    if (neo4jOps.length > 0 && this.neo4j) {
      const session = this.neo4j.session();
      try {
        const neo4jResults = await session.executeWrite(async (tx: Transaction) => {
          const txResults = [];
          for (const op of neo4jOps) {
            const { query, parameters: enhancedParams } = 
              TenantValidator.addTenantToNeo4jQuery(op.query, op.parameters, tenantContext);
            const result = await tx.run(query, enhancedParams);
            txResults.push(result.records.map(record => record.toObject()));
          }
          return txResults;
        });
        results.push(...neo4jResults);
      } finally {
        await session.close();
      }
    }
    
    // Execute PostgreSQL operations in transaction
    if (postgresOps.length > 0 && this.postgres) {
      const client = await this.postgres.connect();
      try {
        await client.query('BEGIN');
        for (const op of postgresOps) {
          const { query, parameters: enhancedParams } = 
            this.addTenantToPostgresQuery(op.query, op.parameters, tenantContext);
          const result = await client.query(query, enhancedParams);
          results.push(result.rows);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    
    return results;
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(
    query: string,
    parameters: any,
    tenantContext: TenantContext
  ): string {
    const queryHash = Buffer.from(query + JSON.stringify(parameters)).toString('base64').slice(0, 32);
    const baseKey = this.redisPrefix ? `${this.redisPrefix}:query:${queryHash}` : `query:${queryHash}`;
    return TenantValidator.getTenantCacheKey(baseKey, tenantContext);
  }

  /**
   * Add tenant constraints to PostgreSQL query
   */
  private addTenantToPostgresQuery(
    sqlQuery: string,
    parameters: any[],
    tenantContext: TenantContext
  ): { query: string; parameters: any[] } {
    let enhancedQuery = sqlQuery;
    const enhancedParams = [...parameters, tenantContext.tenantId];
    const tenantParamIndex = enhancedParams.length;

    // Add tenant_id constraint to WHERE clauses
    if (enhancedQuery.includes('WHERE')) {
      enhancedQuery = enhancedQuery.replace(
        /WHERE\s+/i,
        `WHERE tenant_id = $${tenantParamIndex} AND `
      );
    } else if (enhancedQuery.includes('ORDER BY') || enhancedQuery.includes('GROUP BY') || enhancedQuery.includes('LIMIT')) {
      enhancedQuery = enhancedQuery.replace(
        /(ORDER BY|GROUP BY|LIMIT)/i,
        `WHERE tenant_id = $${tenantParamIndex} $1`
      );
    } else {
      enhancedQuery += ` WHERE tenant_id = $${tenantParamIndex}`;
    }

    return {
      query: enhancedQuery,
      parameters: enhancedParams
    };
  }
}

export default TenantDatabase;