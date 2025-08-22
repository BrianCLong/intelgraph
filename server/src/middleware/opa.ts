/**
 * GA Core Enhanced OPA Middleware - Policy-by-Default with Appeal Path
 * 
 * Features:
 * - RBAC enforcement at GraphQL resolver level
 * - Tenant isolation for multi-tenancy 
 * - Field-level permissions
 * - GA Core: Structured denials with appeal path
 * - Policy simulation for what-if analysis
 * - Comprehensive audit logging
 * - Policy caching for performance
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { writeAudit } from '../utils/audit.js';
import { v4 as uuidv4 } from 'uuid';
import { postgresPool } from '../db/postgres.js';
import logger from '../config/logger.js';

const POLICY_APPEAL_BASE_URL = process.env.POLICY_APPEAL_URL || '/policies/appeal';

interface User {
  id?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  permissions?: string[];
}

interface PolicyInput {
  user?: User;
  action: string;
  resource: {
    type: string;
    field?: string;
    path?: string;
    method?: string;
    args?: any;
    params?: any;
    query?: any;
  };
  context: {
    investigationId?: string;
    entityType?: string;
    tenantId?: string;
    ip?: string;
    userAgent?: string;
  };
}

// GA Core: Enhanced policy decision types
export interface PolicyDenial {
  allowed: false;
  policy: string;
  reason: string;
  appeal: {
    path: string;
    requiredRole?: string;
    slaHours?: number;
    appealId: string;
  };
  context: {
    resource: string;
    action: string;
    user: string;
    timestamp: string;
    requestId: string;
  };
}

export interface PolicyAllow {
  allowed: true;
  policy: string;
  conditions?: Record<string, any>;
  auditRequired?: boolean;
  context: {
    resource: string;
    action: string;
    user: string;
    timestamp: string;
    requestId: string;
  };
}

export type PolicyDecision = PolicyAllow | PolicyDenial;

interface LegacyPolicyDecision {
  allow: boolean;
  reason?: string;
  error?: string;
}

interface CacheEntry {
  result: PolicyDecision;
  timestamp: number;
}

interface OPAOptions {
  opaUrl?: string;
  policyPath?: string;
  enabled?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  timeout?: number;
}

interface OPAStats {
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  cacheHits: number;
  errors: number;
}

interface GraphQLContext {
  user?: User;
}

interface GraphQLInfo {
  operation: {
    operation: string;
  };
  fieldName: string;
  parentType: {
    name: string;
  };
}

type GraphQLResolver = (parent: any, args: any, context: GraphQLContext, info: GraphQLInfo) => any;

export class OPAMiddleware {
  private options: Required<OPAOptions>;
  private cache: Map<string, CacheEntry>;
  private stats: OPAStats;

  constructor(options: OPAOptions = {}) {
    this.options = {
      opaUrl: process.env.OPA_URL || 'http://localhost:8181',
      policyPath: options.policyPath || '/v1/data/intelgraph/allow',
      enabled: process.env.OPA_ENABLED !== 'false',
      cacheEnabled: options.cacheEnabled !== false,
      cacheTTL: options.cacheTTL || 300000, // 5 minutes
      timeout: options.timeout || 5000,
      ...options
    };

    this.cache = new Map();
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      cacheHits: 0,
      errors: 0
    };
  }

  /**
   * Generate cache key for policy decision
   */
  private generateCacheKey(input: PolicyInput): string {
    const key = {
      user: input.user?.id || 'anonymous',
      action: input.action,
      resource: input.resource,
      tenantId: input.context.tenantId
    };
    return JSON.stringify(key);
  }

  /**
   * GA Core: Enhanced policy check with structured responses
   */
  async checkPolicy(input: PolicyInput): Promise<PolicyDecision> {
    this.stats.totalRequests++;

    // If OPA is disabled, allow all (development mode)
    if (!this.options.enabled) {
      this.stats.allowedRequests++;
      const requestId = uuidv4();
      return {
        allowed: true,
        policy: 'system.disabled',
        context: {
          resource: input.resource.type || 'unknown',
          action: input.action,
          user: input.user?.id || 'anonymous',
          timestamp: new Date().toISOString(),
          requestId
        }
      } as PolicyAllow;
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(input);
    if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.options.cacheTTL) {
        this.stats.cacheHits++;
        return cached.result;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    try {
      const response = await axios.post(
        `${this.options.opaUrl}${this.options.policyPath}`,
        { input },
        { 
          timeout: this.options.timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const result = response.data.result || { allow: false };
      
      // Cache the result
      if (this.options.cacheEnabled) {
        this.cache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
      }

      if (result.allow) {
        this.stats.allowedRequests++;
      } else {
        this.stats.deniedRequests++;
      }

      return result;

    } catch (error: any) {
      this.stats.errors++;
      logger.error(`OPA policy check failed: ${error.message}`);
      
      // Fail-safe: deny by default on OPA errors
      return { 
        allow: false, 
        reason: 'Policy service unavailable',
        error: error.message 
      };
    }
  }

  /**
   * Create GraphQL resolver middleware
   */
  createGraphQLMiddleware() {
    return async (resolve: GraphQLResolver, parent: any, args: any, context: GraphQLContext, info: GraphQLInfo) => {
      const user = context.user;
      const operation = info.operation.operation; // query, mutation, subscription
      const fieldName = info.fieldName;
      const parentType = info.parentType.name;

      // Build policy input
      const policyInput: PolicyInput = {
        user: {
          id: user?.id,
          email: user?.email,
          role: user?.role,
          tenantId: user?.tenantId,
          permissions: user?.permissions || []
        },
        action: `${operation}.${fieldName}`,
        resource: {
          type: parentType,
          field: fieldName,
          args: this.sanitizeArgs(args)
        },
        context: {
          investigationId: args.investigationId || args.input?.investigationId,
          entityType: args.input?.type || args.type,
          tenantId: user?.tenantId
        }
      };

      const decision = await this.checkPolicy(policyInput);

      if (!decision.allow) {
        await this.auditDeniedAccess(user, policyInput, decision);
        throw new Error(`Access denied: ${decision.reason || 'Insufficient privileges'}`);
      }

      // Allow the operation to proceed
      return resolve(parent, args, context, info);
    };
  }

  /**
   * Create REST API middleware
   */
  createRestMiddleware() {
    return async (req: Request & { user?: User }, res: Response, next: NextFunction): Promise<Response | void> => {
      const user = req.user;
      const method = req.method.toLowerCase();
      const path = req.path;

      const policyInput: PolicyInput = {
        user: {
          id: user?.id,
          email: user?.email,
          role: user?.role,
          tenantId: user?.tenantId,
          permissions: user?.permissions || []
        },
        action: `${method}.${path}`,
        resource: {
          type: 'REST',
          path: path,
          method: method,
          params: req.params,
          query: req.query
        },
        context: {
          tenantId: user?.tenantId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      };

      const decision = await this.checkPolicy(policyInput);

      if (!decision.allow) {
        await this.auditDeniedAccess(user, policyInput, decision);
        return res.status(403).json({ 
          error: 'Access denied',
          reason: decision.reason || 'Insufficient privileges'
        });
      }

      next();
    };
  }

  /**
   * Sanitize arguments for policy evaluation
   */
  private sanitizeArgs(args: any): any {
    // Remove sensitive data that shouldn't be in policy logs
    const sanitized = { ...args };
    
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Audit denied access attempts
   */
  private async auditDeniedAccess(user: User | undefined, policyInput: PolicyInput, decision: PolicyDecision): Promise<void> {
    await writeAudit({
      userId: user?.id,
      action: 'ACCESS_DENIED',
      resourceType: policyInput.resource.type,
      resourceId: policyInput.context.investigationId,
      details: {
        reason: decision.reason,
        action: policyInput.action,
        tenantId: policyInput.context.tenantId
      }
    });
  }

  /**
   * Get middleware statistics
   */
  getStats(): OPAStats & { cacheSize: number; successRate: number; cacheHitRate: number } {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.allowedRequests / this.stats.totalRequests) * 100 : 0,
      cacheHitRate: this.stats.totalRequests > 0 ?
        (this.stats.cacheHits / this.stats.totalRequests) * 100 : 0
    };
  }

  /**
   * Clear policy cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Health check for OPA service
   */
  async healthCheck(): Promise<{ status: string; healthy: boolean; opaStatus?: number; error?: string }> {
    if (!this.options.enabled) {
      return { status: 'disabled', healthy: true };
    }

    try {
      const response = await axios.get(
        `${this.options.opaUrl}/health`,
        { timeout: this.options.timeout }
      );
      
      return { 
        status: 'healthy', 
        healthy: true,
        opaStatus: response.status
      };
    } catch (error: any) {
      return { 
        status: 'unhealthy', 
        healthy: false,
        error: error.message
      };
    }
  }
}

/**
 * Helper function to create OPA-protected resolver
 */
export function withOPACheck(resolver: GraphQLResolver, middleware: OPAMiddleware): GraphQLResolver {
  return async (parent: any, args: any, context: GraphQLContext, info: GraphQLInfo) => {
    return middleware.createGraphQLMiddleware()(resolver, parent, args, context, info);
  };
}

/**
 * Utility to apply OPA checks to multiple resolvers
 */
export function applyOPAToResolvers(resolvers: Record<string, Record<string, any>>, middleware: OPAMiddleware): Record<string, Record<string, any>> {
  const protectedResolvers: Record<string, Record<string, any>> = {};

  for (const [typeName, typeResolvers] of Object.entries(resolvers)) {
    protectedResolvers[typeName] = {};
    
    for (const [fieldName, resolver] of Object.entries(typeResolvers)) {
      if (typeof resolver === 'function') {
        protectedResolvers[typeName][fieldName] = withOPACheck(resolver, middleware);
      } else {
        protectedResolvers[typeName][fieldName] = resolver;
      }
    }
  }

  return protectedResolvers;
}

// ========================================
// GA CORE: Policy-by-Default with Appeals
// ========================================

/**
 * GA Core: Enhanced policy middleware with structured denials
 */
export function gaCorePolicyMiddleware(
  resource: string,
  action: string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();
    
    try {
      // Extract user info from auth middleware
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({
          error: 'Authentication required for policy evaluation',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // Build policy input
      const input = {
        resource,
        action,
        user: {
          id: user.id,
          role: user.role,
          permissions: user.permissions || [],
          tenantId: user.tenantId
        },
        context: {
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          timestamp,
          requestId
        }
      };

      // Query OPA for decision
      const decision = await queryOPAWithAppealInfo(input);

      // Store decision for audit
      await auditGAPolicyDecision(decision);

      if (decision.allowed) {
        // Allow with conditions
        (req as any).policyDecision = decision;
        
        logger.info({
          message: 'GA Core policy authorization granted',
          resource,
          action,
          userId: user.id,
          policy: decision.policy,
          requestId
        });
        
        next();
      } else {
        // Deny with structured response
        const denial = decision as PolicyDenial;
        
        logger.warn({
          message: 'GA Core policy authorization denied',
          resource,
          action,
          userId: user.id,
          policy: denial.policy,
          reason: denial.reason,
          appealId: denial.appeal.appealId,
          requestId
        });

        // GA Core requirement: structured denial with appeal path
        res.status(403).json({
          error: 'Access denied by policy',
          code: 'POLICY_DENIED',
          details: {
            policy: denial.policy,
            reason: denial.reason,
            appeal: denial.appeal,
            context: denial.context
          }
        });
      }

    } catch (error) {
      logger.error({
        message: 'GA Core policy middleware error',
        error: error instanceof Error ? error.message : String(error),
        resource,
        action,
        requestId
      });

      // Fail secure - deny by default
      const emergencyAppealId = uuidv4();
      res.status(403).json({
        error: 'Policy evaluation failed - access denied by default',
        code: 'POLICY_EVAL_ERROR',
        details: {
          policy: 'system.fail_secure',
          reason: 'Policy engine unavailable or error occurred',
          appeal: {
            path: `${POLICY_APPEAL_BASE_URL}?case=${emergencyAppealId}`,
            requiredRole: 'PolicyAdmin',
            slaHours: 2, // Emergency escalation
            appealId: emergencyAppealId
          },
          context: {
            resource,
            action,
            user: (req as any).user?.id || 'unknown',
            timestamp,
            requestId
          }
        }
      });
    }
  };
}

/**
 * Query OPA with appeal information
 */
async function queryOPAWithAppealInfo(input: any): Promise<PolicyDecision> {
  const opaUrl = process.env.OPA_URL || 'http://localhost:8181';
  
  try {
    const response = await axios.post(
      `${opaUrl}/v1/data/intelgraph/authorize`,
      { input },
      {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const result = response.data.result;
    const baseContext = {
      resource: input.resource,
      action: input.action,
      user: input.user.id,
      timestamp: input.context.timestamp,
      requestId: input.context.requestId
    };

    if (result.allow) {
      return {
        allowed: true,
        policy: result.policy || 'default.allow',
        conditions: result.conditions,
        auditRequired: result.audit_required || false,
        context: baseContext
      } as PolicyAllow;
    } else {
      // Generate appeal case
      const appealId = uuidv4();
      const requiredRole = result.required_role_for_appeal || 'DataSteward';
      const slaHours = result.sla_hours || 24;

      return {
        allowed: false,
        policy: result.policy || 'default.deny',
        reason: result.reason || 'Access denied by policy',
        appeal: {
          path: `${POLICY_APPEAL_BASE_URL}?case=${appealId}`,
          requiredRole,
          slaHours,
          appealId
        },
        context: baseContext
      } as PolicyDenial;
    }

  } catch (error) {
    logger.error({
      message: 'OPA query failed',
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Audit GA policy decision for compliance
 */
async function auditGAPolicyDecision(decision: PolicyDecision): Promise<void> {
  try {
    const auditEntry = {
      id: uuidv4(),
      event_type: 'ga_policy_decision',
      resource_type: 'policy',
      resource_id: decision.policy,
      user_id: decision.context.user,
      action: decision.context.action,
      result: decision.allowed ? 'allowed' : 'denied',
      details: {
        policy: decision.policy,
        resource: decision.context.resource,
        ...(decision.allowed 
          ? { conditions: (decision as PolicyAllow).conditions }
          : { 
              reason: (decision as PolicyDenial).reason,
              appealId: (decision as PolicyDenial).appeal.appealId
            }
        )
      },
      timestamp: new Date(decision.context.timestamp),
      request_id: decision.context.requestId
    };

    await postgresPool.query(
      `INSERT INTO audit_logs (
        id, event_type, resource_type, resource_id, user_id, 
        action, result, details, timestamp, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        auditEntry.id,
        auditEntry.event_type,
        auditEntry.resource_type,
        auditEntry.resource_id,
        auditEntry.user_id,
        auditEntry.action,
        auditEntry.result,
        JSON.stringify(auditEntry.details),
        auditEntry.timestamp,
        auditEntry.request_id
      ]
    );

  } catch (error) {
    logger.error({
      message: 'Failed to audit GA policy decision',
      error: error instanceof Error ? error.message : String(error)
    });
    // Don't fail the request due to audit errors
  }
}

/**
 * GA Core: Policy appeals handler
 */
export async function handleGAPolicyAppeal(req: Request, res: Response): Promise<void> {
  try {
    const { case: appealId } = req.query;
    const user = (req as any).user;
    
    if (!appealId || !user) {
      res.status(400).json({
        error: 'Appeal case ID and authentication required',
        code: 'INVALID_APPEAL_REQUEST'
      });
      return;
    }

    // Look up the original policy decision
    const auditQuery = `
      SELECT * FROM audit_logs 
      WHERE event_type = 'ga_policy_decision' 
        AND result = 'denied'
        AND details->>'appealId' = $1
      ORDER BY timestamp DESC 
      LIMIT 1
    `;
    
    const auditResult = await postgresPool.query(auditQuery, [appealId]);
    
    if (auditResult.rows.length === 0) {
      res.status(404).json({
        error: 'Appeal case not found',
        code: 'APPEAL_NOT_FOUND'
      });
      return;
    }

    const originalDecision = auditResult.rows[0];
    
    // Create appeal record
    const appealRecord = {
      id: uuidv4(),
      appeal_id: appealId as string,
      original_user_id: originalDecision.user_id,
      appellant_user_id: user.id,
      policy: originalDecision.details.policy,
      resource: originalDecision.details.resource,
      action: originalDecision.action,
      reason: originalDecision.details.reason,
      status: 'submitted',
      created_at: new Date()
    };

    await postgresPool.query(
      `INSERT INTO policy_appeals (
        id, appeal_id, original_user_id, appellant_user_id, policy,
        resource, action, reason, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        appealRecord.id,
        appealRecord.appeal_id,
        appealRecord.original_user_id,
        appealRecord.appellant_user_id,
        appealRecord.policy,
        appealRecord.resource,
        appealRecord.action,
        appealRecord.reason,
        appealRecord.status,
        appealRecord.created_at
      ]
    );

    logger.info({
      message: 'GA Core policy appeal submitted',
      appealId,
      originalUserId: originalDecision.user_id,
      appellantUserId: user.id,
      policy: originalDecision.details.policy
    });

    res.json({
      message: 'Appeal submitted successfully',
      appealId,
      status: 'submitted',
      policy: originalDecision.details.policy,
      resource: originalDecision.details.resource,
      reason: originalDecision.details.reason
    });

  } catch (error) {
    logger.error({
      message: 'GA Core policy appeal handling failed',
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Failed to process appeal',
      code: 'APPEAL_PROCESSING_ERROR'
    });
  }
}


