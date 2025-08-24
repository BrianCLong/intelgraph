"use strict";
/**
 * withAuthAndPolicy Higher-Order Resolver
 *
 * Provides consistent authentication and authorization enforcement
 * across all GraphQL resolvers using OPA/ABAC policies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPolicyService = setPolicyService;
exports.withAuthAndPolicy = withAuthAndPolicy;
exports.withReadAuth = withReadAuth;
exports.withWriteAuth = withWriteAuth;
exports.withCreateAuth = withCreateAuth;
exports.withUpdateAuth = withUpdateAuth;
exports.withDeleteAuth = withDeleteAuth;
exports.investigationResource = investigationResource;
exports.entityResource = entityResource;
exports.relationshipResource = relationshipResource;
exports.getPolicyStats = getPolicyStats;
const apollo_server_express_1 = require("apollo-server-express");
const zod_1 = require("zod");
const logger = logger.child({ name: 'authPolicy' });
// Zod schemas for validation
const ActionSchema = zod_1.z.string().min(1);
const ResourceSchema = zod_1.z.object({
    type: zod_1.z.string(),
    id: zod_1.z.string()
}).passthrough();
/**
 * Mock policy service - replace with actual OPA integration
 */
class MockPolicyService {
    async evaluate(input) {
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
            const hasTag = resource.missionTags.some((tag) => userTags.includes(tag));
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
let policyService = new MockPolicyService();
/**
 * Set custom policy service (for testing or different OPA implementations)
 */
function setPolicyService(service) {
    policyService = service;
}
/**
 * Higher-order resolver that enforces authentication and authorization
 */
function withAuthAndPolicy(action, resourceFactory) {
    return function (resolver) {
        return async (parent, args, context, info) => {
            const startTime = Date.now();
            try {
                // Validate inputs
                const validAction = ActionSchema.parse(action);
                // Check authentication
                if (!context.user) {
                    logger.warn(`Unauthenticated access attempt. Action: ${validAction}, Operation: ${info.fieldName}, Path: ${info.path}`);
                    throw new apollo_server_express_1.AuthenticationError('Authentication required');
                }
                // Build resource from factory
                const resource = await resourceFactory(args, context);
                const validResource = ResourceSchema.parse(resource);
                // Evaluate policy
                const policyInput = {
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
                    }
                    else {
                        logger.warn(`Authorization denied. User ID: ${context.user.id}, Action: ${validAction}, Resource: ${JSON.stringify(validResource)}, Reason: ${policyResult.reason}, Operation: ${info.fieldName}`);
                    }
                    throw new apollo_server_express_1.ForbiddenError(policyResult.reason || 'Access denied by security policy');
                }
                // Log successful authorization
                logger.info(`Authorization granted. User ID: ${context.user.id}, Action: ${validAction}, Resource Type: ${validResource.type}, Resource ID: ${validResource.id}, Operation: ${info.fieldName}`);
                // Execute the resolver
                const result = await resolver(parent, args, context, info);
                const duration = Date.now() - startTime;
                logger.debug(`Resolver execution completed. User ID: ${context.user.id}, Action: ${validAction}, Operation: ${info.fieldName}, Duration: ${duration}`);
                return result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                if (error instanceof apollo_server_express_1.AuthenticationError || error instanceof apollo_server_express_1.ForbiddenError) {
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
function withReadAuth(resourceFactory) {
    return withAuthAndPolicy('read', resourceFactory);
}
/**
 * Convenience wrapper for write operations
 */
function withWriteAuth(resourceFactory) {
    return withAuthAndPolicy('write', resourceFactory);
}
/**
 * Convenience wrapper for create operations
 */
function withCreateAuth(resourceFactory) {
    return withAuthAndPolicy('create', resourceFactory);
}
/**
 * Convenience wrapper for update operations
 */
function withUpdateAuth(resourceFactory) {
    return withAuthAndPolicy('update', resourceFactory);
}
/**
 * Convenience wrapper for delete operations
 */
function withDeleteAuth(resourceFactory) {
    return withAuthAndPolicy('delete', resourceFactory);
}
/**
 * Common resource factory for investigation-scoped resources
 */
function investigationResource(investigationId, orgId, teamId) {
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
function entityResource(entityId, investigationId, orgId, teamId) {
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
function relationshipResource(relationshipId, investigationId, orgId, teamId) {
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
function getPolicyStats() {
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
//# sourceMappingURL=withAuthAndPolicy.js.map