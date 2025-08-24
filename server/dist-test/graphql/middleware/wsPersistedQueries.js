"use strict";
/**
 * WebSocket Persisted Queries Middleware for graphql-ws
 *
 * Enforces the same persisted query allowlist for WebSocket connections
 * that is applied to HTTP GraphQL requests.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const persistedQueries_js_1 = __importDefault(require("../plugins/persistedQueries.js"));
class WSPersistedQueriesMiddleware {
    constructor(options = {}) {
        this.persistedQueriesPlugin = new persistedQueries_js_1.default(options);
        this.enabled = process.env.NODE_ENV === 'production' &&
            process.env.ALLOW_NON_PERSISTED_QUERIES !== 'true';
    }
    /**
     * Create middleware for graphql-ws useServer
     */
    createMiddleware() {
        const self = this;
        return {
            onConnect: async (ctx) => {
                // Connection-level validation if needed
                console.log('WebSocket connection established for GraphQL subscriptions');
                return true;
            },
            onSubscribe: async (ctx, message) => {
                // Validate each subscription/query operation
                if (!self.enabled) {
                    return; // Allow all operations in development
                }
                try {
                    const { payload } = message;
                    const { query, variables, operationName } = payload;
                    // Use the same validation logic as HTTP
                    await self.persistedQueriesPlugin.processRequest({ query, variables, operationName }, ctx.extra.request);
                    console.log(`✅ WS operation validated: ${operationName || 'anonymous'}`);
                }
                catch (error) {
                    console.error(`❌ WS operation blocked: ${error.message}`);
                    // Return an error that will be sent to the client
                    return [new Error(`WebSocket operation blocked: ${error.message}`)];
                }
            },
            onNext: async (ctx, message, args, result) => {
                // Optional: Add metrics here for successful operations
                return result;
            },
            onError: async (ctx, message, errors) => {
                // Log WS-specific errors
                console.error('WebSocket GraphQL errors:', errors.map(e => e.message));
                return errors;
            },
            onComplete: async (ctx, message) => {
                // Optional: Clean up resources
            }
        };
    }
    /**
     * Get stats about WS query validation
     */
    getStats() {
        return {
            ...this.persistedQueriesPlugin.getStats(),
            wsEnabled: this.enabled
        };
    }
}
exports.default = WSPersistedQueriesMiddleware;
//# sourceMappingURL=wsPersistedQueries.js.map