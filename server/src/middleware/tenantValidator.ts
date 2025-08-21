/**
 * Enhanced Tenant Validation Middleware
 * Provides comprehensive tenant isolation at API, DB, and cache layers
 */

import { GraphQLError } from 'graphql';
import logger from '../config/logger';

const logger = logger.child({ name: 'tenantValidator' });

export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
}

export interface TenantValidationOptions {
  requireExplicitTenant?: boolean;
  allowSystemAccess?: boolean;
  validateOwnership?: boolean;
  cacheScope?: 'tenant' | 'global' | 'user';
}

/**
 * Validates tenant access and creates secure tenant context
 */
export class TenantValidator {
  
  /**
   * Validate tenant access for a given operation
   */
  static validateTenantAccess(
    context: any,
    resourceTenantId?: string,
    options: TenantValidationOptions = {}
  ): TenantContext {
    const {
      requireExplicitTenant = true,
      allowSystemAccess = false,
      validateOwnership = true
    } = options;

    // Extract tenant context from request
    const userTenantId = context.user?.tenantId;
    const userId = context.user?.id;
    const roles = context.user?.roles || [];

    // System-level access check
    if (allowSystemAccess && (roles.includes('SYSTEM') || roles.includes('SUPER_ADMIN'))) {
      logger.info(`System-level access granted for user ${userId}`);
      return {
        tenantId: resourceTenantId || userTenantId || 'system',
        userId,
        roles,
        permissions: ['*']
      };
    }

    // Validate user has tenant context
    if (requireExplicitTenant && !userTenantId) {
      logger.error(`Tenant isolation violation: User ${userId} lacks tenant context`);
      throw new GraphQLError('Tenant context required', {
        extensions: { 
          code: 'TENANT_REQUIRED',
          userId 
        }
      });
    }

    // Cross-tenant access validation
    if (validateOwnership && resourceTenantId && resourceTenantId !== userTenantId) {
      logger.error(`Cross-tenant access denied: User ${userId} (tenant: ${userTenantId}) attempted to access resource (tenant: ${resourceTenantId})`);
      throw new GraphQLError('Cross-tenant access denied', {
        extensions: { 
          code: 'CROSS_TENANT_ACCESS_DENIED',
          userTenant: userTenantId,
          resourceTenant: resourceTenantId
        }
      });
    }

    const effectiveTenantId = resourceTenantId || userTenantId;
    
    logger.debug(`Tenant access validated for user ${userId}, tenant ${effectiveTenantId}`);
    
    return {
      tenantId: effectiveTenantId,
      userId,
      roles,
      permissions: this.calculatePermissions(roles)
    };
  }

  /**
   * Generate tenant-scoped cache key
   */
  static getTenantCacheKey(
    baseKey: string, 
    tenantContext: TenantContext,
    scope: 'tenant' | 'global' | 'user' = 'tenant'
  ): string {
    switch (scope) {
      case 'tenant':
        return `tenant:${tenantContext.tenantId}:${baseKey}`;
      case 'user':
        return `user:${tenantContext.userId}:${baseKey}`;
      case 'global':
        return baseKey;
      default:
        return `tenant:${tenantContext.tenantId}:${baseKey}`;
    }
  }

  /**
   * Generate tenant-scoped database query constraints
   */
  static getTenantQueryConstraints(tenantContext: TenantContext): Record<string, any> {
    return {
      tenantId: tenantContext.tenantId,
      // Additional constraints for multi-tenancy
      deletedAt: null,
      status: { $ne: 'archived' }
    };
  }

  /**
   * Validate and enhance Neo4j query with tenant constraints
   */
  static addTenantToNeo4jQuery(
    cypherQuery: string,
    parameters: Record<string, any>,
    tenantContext: TenantContext
  ): { query: string; parameters: Record<string, any> } {
    // Add tenant parameter
    const enhancedParams = {
      ...parameters,
      tenantId: tenantContext.tenantId
    };

    // Inject tenant filtering into WHERE clauses
    let enhancedQuery = cypherQuery;
    
    // Pattern to add tenant filtering to node matches
    if (!cypherQuery.includes('tenantId')) {
      // Add tenant constraint to MATCH patterns
      enhancedQuery = enhancedQuery.replace(
        /MATCH\s*\((\w+):(\w+)\)/g,
        'MATCH ($1:$2 {tenantId: $tenantId})'
      );
      
      // Add tenant constraint to WHERE clauses
      if (enhancedQuery.includes('WHERE')) {
        enhancedQuery = enhancedQuery.replace(
          /WHERE\s+/g,
          'WHERE n.tenantId = $tenantId AND '
        );
      } else if (enhancedQuery.includes('RETURN')) {
        enhancedQuery = enhancedQuery.replace(
          /RETURN/g,
          'WHERE n.tenantId = $tenantId RETURN'
        );
      }
    }

    logger.debug(`Enhanced Neo4j query with tenant constraints for tenant ${tenantContext.tenantId}`);
    
    return {
      query: enhancedQuery,
      parameters: enhancedParams
    };
  }

  /**
   * Calculate user permissions based on roles
   */
  private static calculatePermissions(roles: string[]): string[] {
    const permissions: Set<string> = new Set();

    roles.forEach(role => {
      switch (role.toUpperCase()) {
        case 'SUPER_ADMIN':
        case 'SYSTEM':
          permissions.add('*');
          break;
        case 'ADMIN':
          permissions.add('investigations:*');
          permissions.add('entities:*');
          permissions.add('relationships:*');
          permissions.add('users:read');
          break;
        case 'ANALYST':
          permissions.add('investigations:read');
          permissions.add('investigations:write');
          permissions.add('entities:read');
          permissions.add('entities:write');
          permissions.add('relationships:read');
          permissions.add('relationships:write');
          permissions.add('graphrag:query');
          break;
        case 'VIEWER':
          permissions.add('investigations:read');
          permissions.add('entities:read');
          permissions.add('relationships:read');
          break;
        default:
          break;
      }
    });

    return Array.from(permissions);
  }

  /**
   * Middleware factory for GraphQL resolvers
   */
  static createTenantMiddleware(options: TenantValidationOptions = {}) {
    return (resolver: any) => {
      return async (parent: any, args: any, context: any, info: any) => {
        try {
          // Extract resource tenant ID from arguments if available
          const resourceTenantId = args.tenantId || args.input?.tenantId || parent?.tenantId;
          
          // Validate tenant access
          const tenantContext = TenantValidator.validateTenantAccess(
            context,
            resourceTenantId,
            options
          );

          // Enhance context with validated tenant information
          const enhancedContext = {
            ...context,
            tenant: tenantContext,
            getTenantCacheKey: (baseKey: string, scope?: 'tenant' | 'global' | 'user') => 
              TenantValidator.getTenantCacheKey(baseKey, tenantContext, scope),
            getTenantQueryConstraints: () => 
              TenantValidator.getTenantQueryConstraints(tenantContext),
            addTenantToNeo4jQuery: (query: string, params: Record<string, any>) =>
              TenantValidator.addTenantToNeo4jQuery(query, params, tenantContext)
          };

          // Call original resolver with enhanced context
          return await resolver(parent, args, enhancedContext, info);
          
        } catch (error) {
          logger.error(`Tenant validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      };
    };
  }
}

export const { validateTenantAccess, getTenantCacheKey, addTenantToNeo4jQuery } = TenantValidator;
export const tenantMiddleware = TenantValidator.createTenantMiddleware;