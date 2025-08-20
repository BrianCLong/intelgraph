/**
 * IntelGraph GraphQL Context Creation
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Request, Response } from 'express';
import { neo4jDriver } from '../db/neo4j.js';
import { postgresPool } from '../db/postgres.js';
import { redisClient } from '../db/redis.js';
import { logger } from '../utils/logger.js';

export interface GraphQLContext {
  req: Request;
  res: Response;
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
    permissions: string[];
  };
  tenant?: {
    id: string;
    name: string;
    settings: Record<string, any>;
  };
  dataSources: {
    neo4j: typeof neo4jDriver;
    postgres: typeof postgresPool;
    redis: typeof redisClient;
  };
  logger: typeof logger;
  requestId: string;
  startTime: number;
}

export async function createContext({ req, res }: { req: Request; res: Response }): Promise<GraphQLContext> {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  const startTime = Date.now();

  // Extract user and tenant from middleware
  const user = (req as any).user;
  const tenant = (req as any).tenant;

  return {
    req,
    res,
    user,
    tenant,
    dataSources: {
      neo4j: neo4jDriver,
      postgres: postgresPool,
      redis: redisClient
    },
    logger: logger.child({ 
      requestId,
      userId: user?.id,
      tenantId: tenant?.id 
    }),
    requestId,
    startTime
  };
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}