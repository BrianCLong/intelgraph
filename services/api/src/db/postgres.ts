/**
 * IntelGraph PostgreSQL Database Connection
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger.js';

class PostgreSQLConnection {
  private pool: Pool | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.pool) {
      return;
    }

    const config = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'intelgraph',
      user: process.env.POSTGRES_USER || 'intelgraph',
      password: process.env.POSTGRES_PASSWORD || 'password',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
      connectionTimeoutMillis: 10000, // How long to wait for a connection
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

    try {
      this.pool = new Pool(config);

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      logger.info({
        message: 'PostgreSQL connection established',
        host: config.host,
        database: config.database,
        port: config.port
      });

    } catch (error) {
      logger.error({
        message: 'Failed to connect to PostgreSQL',
        error: error instanceof Error ? error.message : String(error),
        host: config.host,
        database: config.database
      });
      throw error;
    }
  }

  async query<T = any>(
    text: string, 
    params?: any[],
    client?: PoolClient
  ): Promise<QueryResult<T>> {
    if (!this.pool && !client) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const queryClient = client || this.pool;
    const startTime = Date.now();

    try {
      const result = await queryClient!.query(text, params);
      
      const duration = Date.now() - startTime;
      if (duration > 1000) { // Log slow queries
        logger.warn({
          message: 'Slow PostgreSQL query',
          duration,
          query: text.substring(0, 100),
          params: params?.slice(0, 5) // Log only first 5 params for security
        });
      }

      return result;
    } catch (error) {
      logger.error({
        message: 'PostgreSQL query failed',
        query: text.substring(0, 100),
        params: params?.slice(0, 5),
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }
    return this.pool.connect();
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({
        message: 'PostgreSQL transaction failed',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // Common query helpers
  async findOne<T = any>(
    table: string,
    conditions: Record<string, any>,
    client?: PoolClient
  ): Promise<T | null> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    
    const query = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
    const result = await this.query<T>(query, values, client);
    
    return result.rows[0] || null;
  }

  async findMany<T = any>(
    table: string,
    conditions: Record<string, any> = {},
    options: {
      orderBy?: string;
      limit?: number;
      offset?: number;
    } = {},
    client?: PoolClient
  ): Promise<T[]> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    
    let query = `SELECT * FROM ${table}`;
    
    if (keys.length > 0) {
      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }
    
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.query<T>(query, values, client);
    return result.rows;
  }

  async insert<T = any>(
    table: string,
    data: Record<string, any>,
    returning = '*',
    client?: PoolClient
  ): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING ${returning}
    `;
    
    const result = await this.query<T>(query, values, client);
    return result.rows[0];
  }

  async update<T = any>(
    table: string,
    data: Record<string, any>,
    conditions: Record<string, any>,
    returning = '*',
    client?: PoolClient
  ): Promise<T | null> {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const conditionKeys = Object.keys(conditions);
    const conditionValues = Object.values(conditions);
    
    const setClause = dataKeys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    const whereClause = conditionKeys.map((key, index) => `${key} = $${dataKeys.length + index + 1}`).join(' AND ');
    
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING ${returning}
    `;
    
    const result = await this.query<T>(query, [...dataValues, ...conditionValues], client);
    return result.rows[0] || null;
  }

  async delete(
    table: string,
    conditions: Record<string, any>,
    client?: PoolClient
  ): Promise<number> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    
    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await this.query(query, values, client);
    
    return result.rowCount || 0;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.pool) {
        return { status: 'disconnected' };
      }

      const result = await this.query('SELECT version(), now() as current_time');
      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
          serverInfo: result.rows[0]
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

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('PostgreSQL connection closed');
    }
  }
}

// Export singleton instance
export const postgresConnection = new PostgreSQLConnection();
export const postgresPool = postgresConnection;

// Initialize connection on module load
postgresConnection.connect().catch(error => {
  logger.error({
    message: 'Failed to initialize PostgreSQL connection',
    error: error instanceof Error ? error.message : String(error)
  });
});