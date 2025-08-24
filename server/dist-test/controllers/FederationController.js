/**
 * Federation Controller
 * P0 Critical - MVP1 requirement for cross-instance management
 */
const FederatedSearchService = require('../services/FederatedSearchService');
class FederationController {
    constructor(authService) {
        this.auth = authService;
        this.federatedSearch = new FederatedSearchService(authService);
    }
    /**
     * Register a new federated instance
     * POST /api/federation/instances
     */
    async registerInstance(req, res) {
        try {
            const { id, name, endpoint, apiKey, publicKey, capabilities, accessLevel, maxConcurrentQueries, timeout } = req.body;
            const userId = req.user.id;
            // Check admin permissions
            const hasPermission = await this.auth.hasRole(userId, 'admin');
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Admin permissions required to register instances'
                });
            }
            const instance = await this.federatedSearch.registerInstance({
                id,
                name,
                endpoint,
                apiKey,
                publicKey,
                capabilities: capabilities || [],
                accessLevel: accessLevel || 'public',
                maxConcurrentQueries: maxConcurrentQueries || 5,
                timeout: timeout || 30000
            });
            res.status(201).json({
                success: true,
                instance: {
                    id: instance.id,
                    name: instance.name,
                    endpoint: instance.endpoint,
                    capabilities: Array.from(instance.capabilities),
                    accessLevel: instance.accessLevel,
                    registeredAt: instance.registeredAt,
                    version: instance.version,
                    features: instance.features
                },
                message: 'Instance registered successfully'
            });
        }
        catch (error) {
            console.error('Error registering instance:', error);
            res.status(400).json({
                error: 'Failed to register instance',
                details: error.message
            });
        }
    }
    /**
     * Get all registered instances
     * GET /api/federation/instances
     */
    async listInstances(req, res) {
        try {
            const userId = req.user.id;
            const userRole = await this.auth.getUserRole(userId);
            const stats = this.federatedSearch.getFederationStats();
            // Filter instances based on user access level
            let visibleInstances = stats.instances;
            if (userRole !== 'admin') {
                visibleInstances = stats.instances.filter(instance => instance.accessLevel === 'public' ||
                    (instance.accessLevel === 'restricted' && ['lead', 'analyst'].includes(userRole)));
            }
            res.json({
                instances: visibleInstances,
                summary: {
                    total: stats.connectedInstances,
                    healthy: stats.healthyInstances,
                    visible: visibleInstances.length
                },
                metrics: userRole === 'admin' ? stats.metrics : null
            });
        }
        catch (error) {
            console.error('Error listing instances:', error);
            res.status(500).json({
                error: 'Failed to list instances'
            });
        }
    }
    /**
     * Get specific instance details
     * GET /api/federation/instances/:id
     */
    async getInstance(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = await this.auth.getUserRole(userId);
            const stats = this.federatedSearch.getFederationStats();
            const instance = stats.instances.find(i => i.id === id);
            if (!instance) {
                return res.status(404).json({
                    error: 'Instance not found'
                });
            }
            // Check access permissions
            if (userRole !== 'admin' && instance.accessLevel === 'private') {
                return res.status(403).json({
                    error: 'Access denied to this instance'
                });
            }
            if (userRole === 'viewer' && instance.accessLevel === 'restricted') {
                return res.status(403).json({
                    error: 'Insufficient permissions to view this instance'
                });
            }
            res.json({
                instance,
                connectionStatus: this.federatedSearch.connectionStatus.get(id)
            });
        }
        catch (error) {
            console.error('Error getting instance:', error);
            res.status(500).json({
                error: 'Failed to get instance details'
            });
        }
    }
    /**
     * Update instance configuration
     * PATCH /api/federation/instances/:id
     */
    async updateInstance(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const userId = req.user.id;
            // Check admin permissions
            const hasPermission = await this.auth.hasRole(userId, 'admin');
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Admin permissions required to update instances'
                });
            }
            // Get current instance
            const connectedInstance = this.federatedSearch.connectedInstances.get(id);
            if (!connectedInstance) {
                return res.status(404).json({
                    error: 'Instance not found'
                });
            }
            // Apply allowed updates
            const allowedUpdates = [
                'name', 'capabilities', 'accessLevel',
                'maxConcurrentQueries', 'timeout'
            ];
            for (const [key, value] of Object.entries(updates)) {
                if (allowedUpdates.includes(key)) {
                    if (key === 'capabilities') {
                        connectedInstance.capabilities = new Set(value);
                    }
                    else {
                        connectedInstance[key] = value;
                    }
                }
            }
            res.json({
                success: true,
                instance: {
                    id: connectedInstance.id,
                    name: connectedInstance.name,
                    capabilities: Array.from(connectedInstance.capabilities),
                    accessLevel: connectedInstance.accessLevel,
                    maxConcurrentQueries: connectedInstance.maxConcurrentQueries,
                    timeout: connectedInstance.timeout
                },
                message: 'Instance updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating instance:', error);
            res.status(500).json({
                error: 'Failed to update instance'
            });
        }
    }
    /**
     * Remove instance from federation
     * DELETE /api/federation/instances/:id
     */
    async unregisterInstance(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            // Check admin permissions
            const hasPermission = await this.auth.hasRole(userId, 'admin');
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Admin permissions required to unregister instances'
                });
            }
            await this.federatedSearch.unregisterInstance(id);
            res.json({
                success: true,
                message: 'Instance unregistered successfully'
            });
        }
        catch (error) {
            console.error('Error unregistering instance:', error);
            res.status(400).json({
                error: 'Failed to unregister instance',
                details: error.message
            });
        }
    }
    /**
     * Execute federated search
     * POST /api/federation/search
     */
    async federatedSearch(req, res) {
        try {
            const { query, instances, maxResults, timeout, aggregateResults = true, respectACL = true, cacheResults = true } = req.body;
            const userId = req.user.id;
            const userRole = await this.auth.getUserRole(userId);
            // Validate query
            if (!query || !query.graphql) {
                return res.status(400).json({
                    error: 'GraphQL query is required'
                });
            }
            const options = {
                instances: instances || [],
                maxResults: maxResults || 100,
                timeout: timeout || 30000,
                aggregateResults,
                respectACL,
                cacheResults,
                userId,
                userRole
            };
            const startTime = Date.now();
            const results = await this.federatedSearch.federatedSearch(query, options);
            res.json({
                success: true,
                results,
                executionTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Federated search error:', error);
            res.status(400).json({
                error: 'Federated search failed',
                details: error.message
            });
        }
    }
    /**
     * Test instance connectivity
     * POST /api/federation/instances/:id/test
     */
    async testInstance(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            // Check permissions
            const userRole = await this.auth.getUserRole(userId);
            if (!['admin', 'lead'].includes(userRole)) {
                return res.status(403).json({
                    error: 'Insufficient permissions to test instances'
                });
            }
            const instance = this.federatedSearch.connectedInstances.get(id);
            if (!instance) {
                return res.status(404).json({
                    error: 'Instance not found'
                });
            }
            const startTime = Date.now();
            const healthCheck = await this.federatedSearch.performHealthCheck(instance.endpoint, instance.apiKey);
            const testQuery = {
                graphql: `
          query TestConnection {
            __schema {
              types {
                name
              }
            }
          }
        `
            };
            let queryResult = null;
            try {
                queryResult = await this.federatedSearch.executeInstanceQuery(instance, testQuery, 'test-connection', 5000);
            }
            catch (error) {
                queryResult = {
                    success: false,
                    error: error.message
                };
            }
            res.json({
                success: healthCheck.healthy && queryResult.success,
                instance: {
                    id: instance.id,
                    name: instance.name,
                    endpoint: instance.endpoint
                },
                healthCheck,
                queryTest: queryResult,
                totalTestTime: Date.now() - startTime
            });
        }
        catch (error) {
            console.error('Error testing instance:', error);
            res.status(500).json({
                error: 'Failed to test instance'
            });
        }
    }
    /**
     * Get federation statistics
     * GET /api/federation/stats
     */
    async getFederationStats(req, res) {
        try {
            const userId = req.user.id;
            const userRole = await this.auth.getUserRole(userId);
            // Only admins can see detailed statistics
            if (userRole !== 'admin') {
                return res.status(403).json({
                    error: 'Admin permissions required for federation statistics'
                });
            }
            const stats = this.federatedSearch.getFederationStats();
            res.json({
                ...stats,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error getting federation stats:', error);
            res.status(500).json({
                error: 'Failed to get federation statistics'
            });
        }
    }
    /**
     * Clear federation cache
     * POST /api/federation/cache/clear
     */
    async clearCache(req, res) {
        try {
            const userId = req.user.id;
            // Check admin permissions
            const hasPermission = await this.auth.hasRole(userId, 'admin');
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Admin permissions required to clear cache'
                });
            }
            const cacheSize = this.federatedSearch.queryCache.size;
            this.federatedSearch.queryCache.clear();
            res.json({
                success: true,
                message: `Cleared ${cacheSize} cached queries`,
                clearedEntries: cacheSize
            });
        }
        catch (error) {
            console.error('Error clearing cache:', error);
            res.status(500).json({
                error: 'Failed to clear cache'
            });
        }
    }
    /**
     * Get available query capabilities across all instances
     * GET /api/federation/capabilities
     */
    async getCapabilities(req, res) {
        try {
            const userId = req.user.id;
            const userRole = await this.auth.getUserRole(userId);
            const stats = this.federatedSearch.getFederationStats();
            // Aggregate capabilities from accessible instances
            const capabilities = new Set();
            const instanceCapabilities = {};
            stats.instances.forEach(instance => {
                // Check if user can access this instance
                const canAccess = instance.accessLevel === 'public' ||
                    (instance.accessLevel === 'restricted' && ['admin', 'lead', 'analyst'].includes(userRole)) ||
                    (instance.accessLevel === 'private' && userRole === 'admin');
                if (canAccess) {
                    instance.capabilities.forEach(cap => capabilities.add(cap));
                    instanceCapabilities[instance.id] = {
                        name: instance.name,
                        capabilities: instance.capabilities,
                        healthy: instance.healthy
                    };
                }
            });
            res.json({
                availableCapabilities: Array.from(capabilities),
                instanceCapabilities,
                summary: {
                    totalCapabilities: capabilities.size,
                    accessibleInstances: Object.keys(instanceCapabilities).length
                }
            });
        }
        catch (error) {
            console.error('Error getting capabilities:', error);
            res.status(500).json({
                error: 'Failed to get capabilities'
            });
        }
    }
}
module.exports = FederationController;
//# sourceMappingURL=FederationController.js.map