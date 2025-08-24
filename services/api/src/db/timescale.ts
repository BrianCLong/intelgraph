/**
 * IntelGraph TimescaleDB Connection
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Pool, QueryResult } from 'pg';
import { logger } from '../utils/logger.js';

// Create a connection pool for TimescaleDB
const config = {
  host: process.env.TIMESCALEDB_HOST || 'localhost',
  port: parseInt(process.env.TIMESCALEDB_PORT || '5433', 10),
  database: process.env.TIMESCALEDB_DB || 'intelgraph_timeseries',
  user: process.env.TIMESCALEDB_USER || 'timescale',
  password: process.env.TIMESCALEDB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

export const timescalePool = new Pool(config);

timescalePool.on('error', (err) => {
  logger.error({
    message: 'TimescaleDB pool error',
    error: err instanceof Error ? err.message : String(err)
  });
});

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await timescalePool.query<T>(text, params);
  const duration = Date.now() - start;

  if (duration > 1000) {
    logger.warn({
      message: 'Slow TimescaleDB query',
      duration,
      query: text.substring(0, 100),
      params: params?.slice(0, 5)
    });
  }

  return result;
}

export default {
  query
};

