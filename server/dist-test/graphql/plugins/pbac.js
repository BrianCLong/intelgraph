"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pbacPlugin;
// Apollo Server 5 compatible PBAC plugin to enforce decisions at field level
const graphql_1 = require("graphql");
const AccessControl_js_1 = require("../../services/AccessControl.js");
function opName(info) {
    try {
        return info?.operation?.operation || 'query';
    }
    catch (_) {
        return 'query';
    }
}
function pbacPlugin() {
    return {
        async requestDidStart() {
            return {
                async executionDidStart() {
                    return {
                        async willResolveField(fieldResolverParams) {
                            const { source, args, contextValue, info } = fieldResolverParams;
                            // Skip introspection fields
                            if (info.fieldName.startsWith('__')) {
                                return;
                            }
                            // Build a resource descriptor from type and field path
                            const parentType = info.parentType?.name;
                            const fieldName = info.fieldName;
                            const path = `${parentType}.${fieldName}`;
                            const action = `${opName(info)}:${path}`; // e.g., query:Entity.props
                            const user = contextValue?.user || null;
                            // Include basic resource attributes (args are often key filters)
                            const resource = {
                                type: parentType,
                                field: fieldName,
                                path,
                                args,
                            };
                            const env = { tenant: process.env.TENANT || 'default' };
                            try {
                                const decision = await (0, AccessControl_js_1.evaluate)(action, user, resource, env);
                                if (!decision?.allow) {
                                    throw new graphql_1.GraphQLError('Forbidden', {
                                        extensions: { code: 'FORBIDDEN', reason: decision?.reason || 'policy_denied' },
                                    });
                                }
                            }
                            catch (e) {
                                if (e instanceof graphql_1.GraphQLError)
                                    throw e;
                                // If AccessControl throws unexpectedly, default to deny-safe
                                throw new graphql_1.GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
                            }
                            // Authorization passed, continue with execution
                        },
                    };
                },
            };
        },
    };
}
;
//# sourceMappingURL=pbac.js.map