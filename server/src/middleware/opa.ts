/**
 * OPA (Open Policy Agent) Middleware for IntelGraph
 * 
 * Features:
 * - RBAC enforcement at GraphQL resolver level
 * - Tenant isolation for multi-tenancy
 * - Field-level permissions
 * - Audit logging for denied operations
 * - Policy caching for performance
 */

import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import { writeAudit } from '../utils/audit.js';

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
  operation?: string;
  field?: string;
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

interface PolicyDecision {
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
  req?: Request;
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
   * Check policy with OPA
   */
  async checkPolicy(input: PolicyInput): Promise<PolicyDecision> {
    this.stats.totalRequests++;

    // If OPA is disabled, allow all (development mode)
    if (!this.options.enabled) {
      this.stats.allowedRequests++;
      return { allow: true, reason: 'OPA disabled' };
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
      const tenantSlug = (user as any)?.tenant_slug || context.req?.headers['x-tenant-slug'] as string || 'default';
      const operation = info.operation.operation; // query, mutation, subscription
      const fieldName = info.fieldName;
      const parentType = info.parentType.name;

      // Build policy input
        const policyInput: PolicyInput = {
          user: {
            id: user?.id,
            email: user?.email,
            role: user?.role,
            tenantId: tenantSlug,
            permissions: user?.permissions || []
          },
          action: `${operation}.${fieldName}`,
          operation,
          field: fieldName,
          resource: {
            type: parentType,
            field: fieldName,
            args: this.sanitizeArgs(args)
          },
          context: {
            investigationId: args.investigationId || args.input?.investigationId,
            entityType: args.input?.type || args.type,
            tenantId: tenantSlug
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


