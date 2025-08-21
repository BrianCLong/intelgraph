/**
 * withAuthAndPolicy Higher-Order Resolver
 * 
 * Provides consistent authentication and authorization enforcement
 * across all GraphQL resolvers using OPA/ABAC policies.
 */

import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { z } from 'zod';
import logger from '../config/logger';

const logger = logger.child({ name: 'authPolicy' });

// Types for authentication and authorization
interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  tenantId?: string;
  orgId?: string;
  teamId?: string;
  missionTags?: string[];
}

interface Resource {
  type: string;
  id: string;
  orgId?: string;
  teamId?: string;
  missionTags?: string[];
  validFrom?: string;
  validTo?: string;
  [key: string]: any;
}

interface PolicyInput {
  action: string;
  user: User;
  resource: Resource;
  context?: Record<string, any>;
}

interface Context {
  user?: User;
  req: any;
  [key: string]: any;
}

// Policy evaluation service interface
interface PolicyService {
  evaluate(input: PolicyInput): Promise<{
    allow: boolean;
    reason?: string;
    obligations?: string[];
  }>;
}

// Zod schemas for validation
const ActionSchema = z.string().min(1);
const ResourceSchema = z.object({
  type: z.string(),
  id: z.string()
}).passthrough();

/**
 * Mock policy service - replace with actual OPA integration
 */
class MockPolicyService implements PolicyService {
  async evaluate(input: PolicyInput): Promise<{ allow: boolean; reason?: string }> {
    const { action, user, resource } = input;

    // Default deny-by-default policy
    if (!user) {
      return { allow: false, reason: 'No authenticated user' };
    }

    // Compartment checks
    if (resource.orgId && user.orgId && resource.orgId !== user.orgId) {
      logger.warn(`Org mismatch: user ${user.orgId} attempted to access org ${resource.orgId}`);
      return { allow: false, reason: 'org_compartment_mismatch' };
    }
    if (resource.teamId && user.teamId && resource.teamId !== user.teamId) {
      logger.warn(`Team mismatch: user ${user.teamId} attempted to access team ${resource.teamId}`);
      return { allow: false, reason: 'team_compartment_mismatch' };
    }

    // Mission tag checks
    if (resource.missionTags && resource.missionTags.length > 0) {
      const userTags = user.missionTags || [];
      const hasTag = resource.missionTags.some((tag: string) => userTags.includes(tag));
      if (!hasTag) {
        logger.warn(`Mission tag mismatch: user tags ${userTags} attempted to access ${resource.missionTags}`);
        return { allow: false, reason: 'mission_tag_mismatch' };
      }
    }

    // Temporal validity checks
    const now = new Date();
    if (resource.validFrom && new Date(resource.validFrom) > now) {
      return { allow: false, reason: 'not_yet_valid' };
    }
    if (resource.validTo && new Date(resource.validTo) < now) {
      return { allow: false, reason: 'expired' };
    }

    // Super admin bypass
    if (user.roles.includes('admin')) {
      return { allow: true };
    }

    // Basic role-based checks
    const [operation] = action.split(':');

    // Read operations
    if (operation === 'read') {
      return { allow: user.roles.includes('analyst') || user.roles.includes('viewer') };
    }

    // Write operations
    if (operation === 'write' || operation === 'create' || operation === 'update') {
      return { allow: user.roles.includes('analyst') };
    }

    // Delete operations
    if (operation === 'delete') {
      return { allow: user.roles.includes('admin') };
    }

    return { allow: false, reason: `Unknown action: ${action}` };
  }
}

// Global policy service instance
let policyService: PolicyService = new MockPolicyService();

/**
 * Set custom policy service (for testing or different OPA implementations)
 */
export function setPolicyService(service: PolicyService): void {
  policyService = service;
}

/**
 * Resource factory function type
 */
type ResourceFactory<TArgs = any> = (args: TArgs, context: Context) => Resource | Promise<Resource>;

/**
 * Higher-order resolver that enforces authentication and authorization
 */
export function withAuthAndPolicy<TArgs = any, TResult = any>(
  action: string,
  resourceFactory: ResourceFactory<TArgs>
) {
  return function(
    resolver: (parent: any, args: TArgs, context: Context, info: any) => Promise<TResult> | TResult
  ) {
    return async (parent: any, args: TArgs, context: Context, info: any): Promise<TResult> => {
      const startTime = Date.now();
      
      try {
        // Validate inputs
        const validAction = ActionSchema.parse(action);
        
        // Check authentication
        if (!context.user) {
          logger.warn(`Unauthenticated access attempt. Action: ${validAction}, Operation: ${info.fieldName}, Path: ${info.path}`);
          throw new AuthenticationError('Authentication required');
        }

        // Build resource from factory
        const resource = await resourceFactory(args, context);
        const validResource = ResourceSchema.parse(resource);

        // Evaluate policy
        const policyInput: PolicyInput = {
          action: validAction,
          user: context.user,
          resource: validResource,
          context: {
            operation: info.fieldName,
            path: info.path,
            userAgent: context.req?.headers?.['user-agent'],
            ip: context.req?.ip,
            orgId: context.user.orgId,
            teamId: context.user.teamId
          }
        };

        const policyResult = await policyService.evaluate(policyInput);

        if (!policyResult.allow) {
          if (policyResult.reason?.includes('compartment')) {
            logger.error(`Compartment leak attempt. User ID: ${context.user.id}, Action: ${validAction}, Resource: ${JSON.stringify(validResource)}, Reason: ${policyResult.reason}, Operation: ${info.fieldName}`);
          } else {
            logger.warn(`Authorization denied. User ID: ${context.user.id}, Action: ${validAction}, Resource: ${JSON.stringify(validResource)}, Reason: ${policyResult.reason}, Operation: ${info.fieldName}`);
          }

          throw new ForbiddenError(
            policyResult.reason || 'Access denied by security policy'
          );
        }

        // Log successful authorization
        logger.info(`Authorization granted. User ID: ${context.user.id}, Action: ${validAction}, Resource Type: ${validResource.type}, Resource ID: ${validResource.id}, Operation: ${info.fieldName}`);

        // Execute the resolver
        const result = await resolver(parent, args, context, info);

        const duration = Date.now() - startTime;
        logger.debug(`Resolver execution completed. User ID: ${context.user.id}, Action: ${validAction}, Operation: ${info.fieldName}, Duration: ${duration}`);

        return result;

      } catch (error) {
        const duration = Date.now() - startTime;
        
        if (error instanceof AuthenticationError || error instanceof ForbiddenError) {
          // Re-throw auth errors as-is
          throw error;
        }

        logger.error(`Resolver execution failed. User ID: ${context.user?.id}, Action: ${action}, Operation: ${info.fieldName}, Duration: ${duration}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

        throw error;
      }
    };
  };
}

/**
 * Convenience wrapper for read operations
 */
export function withReadAuth<TArgs = any, TResult = any>(
  resourceFactory: ResourceFactory<TArgs>
) {
  return withAuthAndPolicy<TArgs, TResult>('read', resourceFactory);
}

/**
 * Convenience wrapper for write operations
 */
export function withWriteAuth<TArgs = any, TResult = any>(
  resourceFactory: ResourceFactory<TArgs>
) {
  return withAuthAndPolicy<TArgs, TResult>('write', resourceFactory);
}

/**
 * Convenience wrapper for create operations
 */
export function withCreateAuth<TArgs = any, TResult = any>(
  resourceFactory: ResourceFactory<TArgs>
) {
  return withAuthAndPolicy<TArgs, TResult>('create', resourceFactory);
}

/**
 * Convenience wrapper for update operations
 */
export function withUpdateAuth<TArgs = any, TResult = any>(
  resourceFactory: ResourceFactory<TArgs>
) {
  return withAuthAndPolicy<TArgs, TResult>('update', resourceFactory);
}

/**
 * Convenience wrapper for delete operations
 */
export function withDeleteAuth<TArgs = any, TResult = any>(
  resourceFactory: ResourceFactory<TArgs>
) {
  return withAuthAndPolicy<TArgs, TResult>('delete', resourceFactory);
}

/**
 * Common resource factory for investigation-scoped resources
 */
export function investigationResource(investigationId: string, orgId?: string, teamId?: string): Resource {
  return {
    type: 'investigation',
    id: investigationId,
    orgId,
    teamId
  };
}

/**
 * Common resource factory for entity resources
 */
export function entityResource(entityId: string, investigationId?: string, orgId?: string, teamId?: string): Resource {
  return {
    type: 'entity',
    id: entityId,
    investigationId,
    orgId,
    teamId
  };
}

/**
 * Common resource factory for relationship resources
 */
export function relationshipResource(relationshipId: string, investigationId?: string, orgId?: string, teamId?: string): Resource {
  return {
    type: 'relationship',
    id: relationshipId,
    investigationId,
    orgId,
    teamId
  };
}

/**
 * Get policy enforcement statistics
 */
export function getPolicyStats(): {
  serviceType: string;
  totalEvaluations: number;
  deniedRequests: number;
} {
  // This would be implemented by the actual policy service
  return {
    serviceType: 'mock',
    totalEvaluations: 0,
    deniedRequests: 0
  };
}

/**
 * Example usage in resolvers:
 * 
 * const resolvers = {
 *   Query: {
 *     investigation: withReadAuth((args) => ({ type: 'investigation', id: args.id }))(
 *       async (_, { id }, context) => {
 *         // Resolver implementation
 *       }
 *     )
 *   },
 *   
 *   Mutation: {
 *     createEntity: withCreateAuth((args) => ({ type: 'entity', id: 'new' }))(
 *       async (_, { input }, context) => {
 *         // Resolver implementation
 *       }
 *     )
 *   }
 * }
 */