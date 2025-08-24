// src/graphql/plugins/realtimeMutations.js
const { getRedisClient } = require('../../config/database');
const { idempotentHitsTotal } = require('../../monitoring/metrics');
const logger = require('../../utils/logger');
function realtimeMutationsPlugin() {
    return {
        async requestDidStart(requestContext) {
            const { request, operationName, contextValue } = requestContext;
            // Check if the operation is a mutation. Apollo Server's request.query contains the GraphQL query string.
            // A simple check for 'mutation' keyword at the start of the query string.
            const isMutation = request.query && request.query.trim().startsWith('mutation');
            if (isMutation) {
                const opId = request.http.headers.get('x-op-id');
                if (opId) {
                    const redis = getRedisClient();
                    if (!redis) {
                        logger.warn('Redis client not available for realtimeMutationsPlugin. Idempotency will not be applied.');
                        return;
                    }
                    const idempotencyKey = `idempotency:${opId}`;
                    // Check if this operation ID has been processed before
                    const cachedResult = await redis.get(idempotencyKey);
                    if (cachedResult) {
                        logger.info(`Idempotent hit for operation ${opId}`);
                        idempotentHitsTotal.inc();
                        // Return cached result by modifying the response
                        return {
                            async willSendResponse(requestContext) {
                                try {
                                    requestContext.response.data = JSON.parse(cachedResult);
                                    requestContext.response.http.status = 200; // Ensure 200 OK for cached response
                                }
                                catch (e) {
                                    logger.error(`Failed to parse cached result for opId ${opId}: ${e.message}`);
                                    // If parsing fails, treat as if no cache hit and let the original mutation proceed (or error)
                                }
                            }
                        };
                    }
                    // Store the result after the mutation is executed
                    return {
                        async willSendResponse(requestContext) {
                            if (requestContext.response.data && !requestContext.response.errors) {
                                try {
                                    // Cache for 1 hour (3600 seconds)
                                    await redis.set(idempotencyKey, JSON.stringify(requestContext.response.data), 'EX', 3600);
                                }
                                catch (e) {
                                    logger.error(`Failed to cache result for opId ${opId}: ${e.message}`);
                                }
                            }
                        }
                    };
                }
            }
        },
    };
}
module.exports = realtimeMutationsPlugin;
//# sourceMappingURL=realtimeMutations.js.map