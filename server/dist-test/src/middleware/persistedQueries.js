"use strict";
/**
 * Persisted Queries Middleware
 *
 * Enforces persisted query allowlist in production and provides
 * development-friendly mode for local development.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistedQueries = exports.PersistedQueriesMiddleware = void 0;
exports.createPersistedQueriesMiddleware = createPersistedQueriesMiddleware;
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const logger = logger.child({ name: 'persistedQueries' });
class PersistedQueriesMiddleware {
    constructor(config = {}) {
        this.manifests = new Map();
        /**
         * Express middleware for persisted query enforcement
         */
        this.middleware = () => {
            return (req, res, next) => {
                // Skip non-GraphQL requests
                if (!this.isGraphQLRequest(req)) {
                    return next();
                }
                // Development mode - allow all queries but log warnings
                if (!this.isProduction && !this.config.enforceInProduction) {
                    this.handleDevelopmentMode(req);
                    return next();
                }
                // Production mode - enforce allowlist
                try {
                    this.enforcePersistedQueries(req, res, next);
                }
                catch (error) {
                    logger.error(`Persisted query enforcement failed. Error: ${error instanceof Error ? error.message : 'Unknown error'}, Path: ${req.path}`);
                    res.status(500).json({
                        errors: [{
                                message: 'Internal server error',
                                extensions: { code: 'INTERNAL_ERROR' }
                            }]
                    });
                }
            };
        };
        this.isProduction = process.env.NODE_ENV === 'production';
        this.config = {
            manifestDirectory: config.manifestDirectory || (0, path_1.join)(process.cwd(), 'persisted-operations'),
            enforceInProduction: config.enforceInProduction ?? true,
            allowIntrospection: config.allowIntrospection ?? !this.isProduction,
            allowPlayground: config.allowPlayground ?? !this.isProduction
        };
    }
    /**
     * Load persisted queries manifest for a tenant
     */
    loadManifest(tenantId) {
        if (this.manifests.has(tenantId)) {
            return this.manifests.get(tenantId);
        }
        const path = (0, path_1.join)(this.config.manifestDirectory, `${tenantId}.json`);
        try {
            if ((0, fs_1.existsSync)(path)) {
                const content = (0, fs_1.readFileSync)(path, 'utf8');
                const manifest = JSON.parse(content);
                this.manifests.set(tenantId, manifest);
                logger.info(`Persisted queries manifest loaded`, { tenantId, operations: Object.keys(manifest).length });
                return manifest;
            }
            logger.warn(`Persisted queries manifest not found`, { tenantId });
            this.manifests.set(tenantId, {});
            return {};
        }
        catch (error) {
            logger.error(`Failed to load persisted queries manifest`, { tenantId, error: error instanceof Error ? error.message : 'Unknown error' });
            this.manifests.set(tenantId, {});
            return {};
        }
    }
    /**
     * Check if request is a GraphQL request
     */
    isGraphQLRequest(req) {
        return req.path === '/graphql' || req.path.includes('graphql');
    }
    /**
     * Handle development mode (allow all but warn about non-persisted)
     */
    handleDevelopmentMode(req) {
        const body = req.body;
        const tenantId = req.headers['x-tenant-id'] || 'unknown';
        const manifest = this.loadManifest(tenantId);
        if (body.query && !this.isQueryInManifest(body.query, manifest)) {
            logger.warn(`Non-persisted query in development mode. Operation Name: ${body.operationName}, Query Hash: ${this.hashQuery(body.query).substring(0, 8)}, Tenant: ${tenantId}`);
        }
    }
    /**
     * Enforce persisted queries in production
     */
    enforcePersistedQueries(req, res, next) {
        const body = req.body;
        const tenantId = req.headers['x-tenant-id'];
        if (!tenantId) {
            return this.rejectRequest(res, 'Tenant header required');
        }
        const manifest = this.loadManifest(tenantId);
        if (Object.keys(manifest).length === 0) {
            return this.rejectRequest(res, 'Unknown tenant', { tenantId });
        }
        // Handle introspection queries
        if (this.isIntrospectionQuery(body.query)) {
            if (!this.config.allowIntrospection) {
                return this.rejectRequest(res, 'Introspection is disabled');
            }
            return next();
        }
        // Handle Apollo Persisted Queries protocol
        if (body.extensions?.persistedQuery) {
            const hash = body.extensions.persistedQuery.sha256Hash;
            if (manifest[hash]) {
                req.body = { ...body, query: manifest[hash] };
                return next();
            }
            return this.rejectRequest(res, 'Persisted query not found', { hash, tenantId });
        }
        // Handle direct query ID
        if (body.id && manifest[body.id]) {
            req.body = { ...body, query: manifest[body.id] };
            return next();
        }
        // Handle raw queries - only allowed if in manifest
        if (body.query) {
            const queryHash = this.hashQuery(body.query);
            if (manifest[queryHash]) {
                return next();
            }
            return this.rejectRequest(res, 'Query not in persisted operations allowlist', {
                operationName: body.operationName,
                queryHash: queryHash.substring(0, 8),
                tenantId
            });
        }
        // No valid query found
        this.rejectRequest(res, 'No valid query provided');
    }
    /**
     * Check if query is in the manifest
     */
    isQueryInManifest(query, manifest) {
        const hash = this.hashQuery(query);
        return !!manifest[hash];
    }
    /**
     * Check if query is an introspection query
     */
    isIntrospectionQuery(query) {
        if (!query)
            return false;
        return query.includes('__schema') || query.includes('__type');
    }
    /**
     * Hash a query string for manifest lookup
     */
    hashQuery(query) {
        return (0, crypto_1.createHash)('sha256').update(query.trim()).digest('hex');
    }
    /**
     * Reject a request with appropriate error
     */
    rejectRequest(res, message, metadata) {
        logger.warn(`Persisted query request rejected. Message: ${message}, Metadata: ${JSON.stringify(metadata)}`);
        res.status(403).json({
            errors: [{
                    message,
                    extensions: {
                        code: 'PERSISTED_QUERY_NOT_FOUND',
                        ...metadata
                    }
                }]
        });
    }
    /**
     * Get middleware statistics
     */
    getStats() {
        const operationCount = Array.from(this.manifests.values()).reduce((acc, m) => acc + Object.keys(m).length, 0);
        return {
            manifestLoaded: this.manifests.size > 0,
            operationCount,
            isProduction: this.isProduction,
            enforcing: this.isProduction && this.config.enforceInProduction
        };
    }
    /**
     * Reload manifest (useful for development)
     */
    reloadManifest() {
        this.manifests.clear();
    }
}
exports.PersistedQueriesMiddleware = PersistedQueriesMiddleware;
// Default instance for easy usage
exports.persistedQueries = new PersistedQueriesMiddleware();
// Factory function for custom configuration
function createPersistedQueriesMiddleware(config = {}) {
    return new PersistedQueriesMiddleware(config);
}
//# sourceMappingURL=persistedQueries.js.map