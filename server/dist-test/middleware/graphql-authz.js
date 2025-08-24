"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBAC = exports.GraphQLAuthzPlugin = void 0;
exports.authDirective = authDirective;
exports.createAuthzMiddleware = createAuthzMiddleware;
const apollo_server_express_1 = require("apollo-server-express");
const axios_1 = __importDefault(require("axios"));
const index_js_1 = __importDefault(require("../config/index.js"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * GraphQL Authorization Plugin using Open Policy Agent (OPA)
 *
 * This middleware intercepts all GraphQL operations and enforces
 * authorization policies defined in Rego files.
 */
class GraphQLAuthzPlugin {
    constructor(opaUrl = 'http://localhost:8181') {
        this.opaUrl = opaUrl;
        this.enabled = process.env.OPA_ENABLED !== 'false';
        if (!this.enabled) {
            logger_js_1.default.warn('⚠️  OPA authorization is DISABLED - all operations will be allowed');
        }
    }
    /**
     * Apollo Server plugin interface
     */
    requestDidStart() {
        return {
            willSendResponse: async (requestContext) => {
                // Log authorization decisions for audit
                if (requestContext.context.authzDecisions) {
                    logger_js_1.default.info(`Authorization audit. User: ${requestContext.context.user?.id}, Operation: ${requestContext.request.operationName}, Decisions: ${JSON.stringify(requestContext.context.authzDecisions)}, IP: ${requestContext.request.http?.ip}`);
                }
            }
        };
    }
    /**
     * Create authorization middleware for individual resolvers
     */
    createResolverMiddleware() {
        return async (parent, args, context, info, next) => {
            // Skip authorization if disabled
            if (!this.enabled) {
                return next();
            }
            // Ensure user is authenticated
            if (!context.user) {
                throw new apollo_server_express_1.AuthenticationError('Authentication required');
            }
            try {
                // Build OPA input
                const opaInput = this.buildOPAInput(context, args, info);
                // Query OPA for decision
                const decision = await this.queryOPA(opaInput);
                // Track decision for audit
                if (!context.authzDecisions) {
                    context.authzDecisions = [];
                }
                context.authzDecisions.push({
                    field: info.fieldName,
                    decision: decision.allow,
                    reason: decision.reason
                });
                // Enforce decision
                if (!decision.allow) {
                    throw new apollo_server_express_1.ForbiddenError(`Access denied to ${info.fieldName}: ${decision.reason || 'Policy violation'}`);
                }
                return next();
            }
            catch (error) {
                if (error instanceof apollo_server_express_1.ForbiddenError || error instanceof apollo_server_express_1.AuthenticationError) {
                    throw error;
                }
                logger_js_1.default.error(`Authorization error. Error: ${error.message}, Field: ${info.fieldName}, User: ${context.user.id}`);
                // Fail secure - deny on error
                throw new apollo_server_express_1.ForbiddenError('Authorization check failed');
            }
        };
    }
    /**
     * Build OPA input from GraphQL context and info
     */
    buildOPAInput(context, args, info) {
        const operation = info.operation.operation; // 'query' | 'mutation' | 'subscription'
        const fieldName = info.fieldName;
        const parentType = info.parentType.name;
        const returnType = info.returnType.toString().replace(/[[\]!]/g, '');
        return {
            user: {
                id: context.user.id,
                email: context.user.email,
                role: context.user.role,
                tenantId: context.user.tenantId,
                permissions: context.user.permissions || [],
                missionTags: context.user.missionTags || [],
                orgId: context.user.orgId,
                teamId: context.user.teamId
            },
            action: `${operation}.${fieldName}`,
            resource: {
                type: returnType,
                field: fieldName,
                args: this.sanitizeArgs(args),
                missionTags: args.missionTags || [],
                compartment: {
                    orgId: args.orgId,
                    teamId: args.teamId
                },
                validFrom: args.validFrom,
                validUntil: args.validUntil
            },
            context: {
                tenantId: this.extractTenantId(context, args),
                investigationId: args.investigationId || args.id,
                environment: index_js_1.default.env,
                ip: context.req?.ip,
                userAgent: context.req?.get('user-agent'),
                time: new Date().toISOString()
            }
        };
    }
    /**
     * Query OPA for authorization decision
     */
    async queryOPA(input) {
        try {
            const response = await axios_1.default.post(`${this.opaUrl}/v1/data/intelgraph/allow`, { input }, {
                timeout: 5000,
                headers: { 'Content-Type': 'application/json' }
            });
            const result = response.data.result;
            if (typeof result === 'boolean') {
                return { allow: result };
            }
            if (typeof result === 'object' && result !== null) {
                return {
                    allow: result.allow === true,
                    reason: result.reason
                };
            }
            // Default deny if unexpected response
            logger_js_1.default.warn(`Unexpected OPA response format. Result: ${JSON.stringify(result)}`);
            return { allow: false, reason: 'Invalid policy response' };
        }
        catch (error) {
            logger_js_1.default.error(`OPA query failed. Error: ${error.message}, Action: ${input.action}, User: ${input.user.id}`);
            // Fail secure on OPA unavailability
            if (index_js_1.default.env === 'production') {
                return { allow: false, reason: 'Policy engine unavailable' };
            }
            else {
                // Allow in development if OPA is down
                logger_js_1.default.warn('Allowing operation due to OPA unavailability in development');
                return { allow: true, reason: 'Development mode - OPA unavailable' };
            }
        }
    }
    /**
     * Extract tenant ID from context or args
     */
    extractTenantId(context, args) {
        return args.tenantId ||
            context.user.tenantId ||
            context.req?.headers['x-tenant-id'];
    }
    /**
     * Sanitize arguments for policy evaluation (remove sensitive data)
     */
    sanitizeArgs(args) {
        const sanitized = { ...args };
        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        return sanitized;
    }
}
exports.GraphQLAuthzPlugin = GraphQLAuthzPlugin;
/**
 * Field-level authorization directive
 * Usage: @auth(requires: "admin") or @auth(policy: "custom_policy")
 */
function authDirective() {
    return {
        typeDefs: `
      directive @auth(
        requires: String
        policy: String
      ) on FIELD_DEFINITION | OBJECT
    `,
        transformer: (schema) => {
            // Transform schema to add authorization checks
            // This would integrate with the GraphQL schema transformation
            return schema;
        }
    };
}
/**
 * Create authorization middleware for Express/Apollo Server
 */
function createAuthzMiddleware(opaUrl) {
    const plugin = new GraphQLAuthzPlugin(opaUrl);
    return {
        plugin: plugin,
        middleware: plugin.createResolverMiddleware(),
        // Utility to check permissions programmatically
        async checkPermission(user, action, resource, context = {}) {
            const input = {
                user,
                action,
                resource,
                context: {
                    environment: index_js_1.default.env,
                    ...context
                }
            };
            const decision = await plugin['queryOPA'](input);
            return decision.allow;
        }
    };
}
/**
 * RBAC helper functions for common checks
 */
exports.RBAC = {
    isAdmin: (user) => user.role === 'admin',
    isAnalyst: (user) => ['analyst', 'senior_analyst'].includes(user.role),
    canAccess: (user, resource, action) => {
        // Quick local checks before OPA
        if (user.role === 'admin')
            return true;
        if (action === 'read' && exports.RBAC.isAnalyst(user))
            return true;
        return false; // Defer to OPA for complex cases
    }
};
exports.default = GraphQLAuthzPlugin;
//# sourceMappingURL=graphql-authz.js.map