"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPolicy = withPolicy;
exports.wrapResolversWithPolicy = wrapResolversWithPolicy;
const graphql_1 = require("graphql");
const AccessControl_js_1 = require("../services/AccessControl.js");
function withPolicy(action, resolver) {
    return async (parent, args, context, info) => {
        const decision = await (0, AccessControl_js_1.evaluate)(action, context.user, { args, parent }, { tenant: context?.tenant });
        if (!decision.allow) {
            throw new graphql_1.GraphQLError("Forbidden", {
                extensions: {
                    code: "FORBIDDEN",
                    reason: decision.reason || "policy_denied",
                },
            });
        }
        return resolver(parent, args, context, info);
    };
}
function wrapResolversWithPolicy(namespace, resolvers) {
    const wrap = (type) => {
        const src = resolvers[type] || {};
        return Object.fromEntries(Object.entries(src).map(([name, fn]) => [
            name,
            withPolicy(`${namespace}.${type}.${name}`, fn),
        ]));
    };
    return {
        ...resolvers,
        Query: wrap("Query"),
        Mutation: wrap("Mutation"),
    };
}
//# sourceMappingURL=policyWrapper.js.map