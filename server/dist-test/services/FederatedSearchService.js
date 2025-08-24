/**
 * Federated Search Service
 * P0 Critical - MVP1 requirement for cross-instance querying
 * Enables searching across multiple connected IntelGraph instances
 */
const axios = require("axios");
const { GraphQLClient } = require("graphql-request");
class FederatedSearchService {
    constructor(authService, encryptionService = null) {
        this.authService = authService;
        this.encryptionService = encryptionService;
        this.connectedInstances = new Map(); // instanceId -> connection info
        this.queryCache = new Map(); // queryHash -> cached results
        this.accessControlList = new Map(); // instanceId -> ACL rules
        this.federationMetrics = {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            avgLatency: 0,
            instancesQueried: new Set(),
            cacheHits: 0,
            cacheMisses: 0,
        };
        // Connection health monitoring
        this.healthCheckInterval = null;
        this.connectionStatus = new Map(); // instanceId -> health status
        this.initializeHealthMonitoring();
    }
    /**
     * Register a new IntelGraph instance for federation
     */
    async registerInstance(instanceConfig) {
        const { id, name, endpoint, apiKey, publicKey, // For end-to-end encryption
        capabilities = [], accessLevel = "public", // public, restricted, private
        maxConcurrentQueries = 5, timeout = 30000, } = instanceConfig;
        // Validate configuration
        if (!id || !name || !endpoint) {
            throw new Error("Instance ID, name, and endpoint are required");
        }
        // Verify instance is reachable and valid
        const healthCheck = await this.performHealthCheck(endpoint, apiKey);
        if (!healthCheck.healthy) {
            throw new Error(`Instance ${name} is not healthy: ${healthCheck.error}`);
        }
        const instance = {
            id,
            name,
            endpoint: this.normalizeEndpoint(endpoint),
            apiKey,
            publicKey,
            capabilities: new Set(capabilities),
            accessLevel,
            maxConcurrentQueries,
            timeout,
            registeredAt: new Date(),
            lastHealthCheck: new Date(),
            activeQueries: 0,
            totalQueries: 0,
            successRate: 0,
            avgResponseTime: 0,
            version: healthCheck.version,
            features: healthCheck.features || [],
        };
        // Create GraphQL client for this instance
        instance.graphqlClient = new GraphQLClient(`${instance.endpoint}/graphql`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "X-Federation-Source": process.env.INSTANCE_ID || "unknown",
                "X-Request-ID": () => this.generateRequestId(),
            },
            timeout: timeout,
        });
        this.connectedInstances.set(id, instance);
        this.connectionStatus.set(id, { healthy: true, lastCheck: new Date() });
        console.log(`Registered federated instance: ${name} (${id}) at ${endpoint}`);
        return instance;
    }
    /**
     * Remove an instance from federation
     */
    async unregisterInstance(instanceId) {
        const instance = this.connectedInstances.get(instanceId);
        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }
        this.connectedInstances.delete(instanceId);
        this.connectionStatus.delete(instanceId);
        this.accessControlList.delete(instanceId);
        console.log(`Unregistered federated instance: ${instance.name} (${instanceId})`);
    }
    /**
     * Execute federated search across multiple instances
     */
    async federatedSearch(query, options = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        const { instances = [], // Specific instances to query, empty = all
        maxResults = 100, timeout = 30000, aggregateResults = true, respectACL = true, cacheResults = true, userId = null, userRole = "viewer", } = options;
        try {
            // Validate query
            this.validateQuery(query);
            // Check cache first
            const cacheKey = this.generateCacheKey(query, instances);
            if (cacheResults && this.queryCache.has(cacheKey)) {
                this.federationMetrics.cacheHits++;
                const cachedResult = this.queryCache.get(cacheKey);
                // Check if cache is still valid (5 minutes)
                if (Date.now() - cachedResult.timestamp < 300000) {
                    return {
                        ...cachedResult.result,
                        fromCache: true,
                        cacheAge: Date.now() - cachedResult.timestamp,
                    };
                }
                else {
                    this.queryCache.delete(cacheKey);
                }
            }
            this.federationMetrics.cacheMisses++;
            // Determine target instances
            const targetInstances = this.getTargetInstances(instances, query, userId, userRole);
            if (targetInstances.length === 0) {
                throw new Error("No accessible instances available for query");
            }
            console.log(`Executing federated search across ${targetInstances.length} instances`, {
                requestId,
                query: this.sanitizeQueryForLogging(query),
                instances: targetInstances.map((i) => i.name),
            });
            // Execute query across instances in parallel
            const queryPromises = targetInstances.map((instance) => this.executeInstanceQuery(instance, query, requestId, timeout));
            const results = await Promise.allSettled(queryPromises);
            // Process results
            const processedResults = this.processQueryResults(results, targetInstances, aggregateResults);
            // Update metrics
            this.updateFederationMetrics(startTime, results);
            // Cache results if enabled
            if (cacheResults && processedResults.successful.length > 0) {
                this.queryCache.set(cacheKey, {
                    result: processedResults,
                    timestamp: Date.now(),
                });
            }
            return {
                ...processedResults,
                requestId,
                executionTime: Date.now() - startTime,
                fromCache: false,
            };
        }
        catch (error) {
            this.federationMetrics.failedQueries++;
            console.error("Federated search error:", error, { requestId });
            throw error;
        }
        finally {
            this.federationMetrics.totalQueries++;
        }
    }
    /**
     * Execute a specific GraphQL query on a single instance
     */
    async executeInstanceQuery(instance, query, requestId, timeout) {
        const startTime = Date.now();
        try {
            // Check if instance is healthy
            const status = this.connectionStatus.get(instance.id);
            if (!status?.healthy) {
                throw new Error(`Instance ${instance.name} is not healthy`);
            }
            // Check concurrent query limit
            if (instance.activeQueries >= instance.maxConcurrentQueries) {
                throw new Error(`Instance ${instance.name} has reached maximum concurrent queries`);
            }
            instance.activeQueries++;
            // Transform query for this instance if needed
            const transformedQuery = this.transformQueryForInstance(query, instance);
            // Execute the query
            const result = await Promise.race([
                instance.graphqlClient.request(transformedQuery.graphql, transformedQuery.variables),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Query timeout")), timeout)),
            ]);
            // Update instance metrics
            const responseTime = Date.now() - startTime;
            this.updateInstanceMetrics(instance, responseTime, true);
            return {
                instanceId: instance.id,
                instanceName: instance.name,
                success: true,
                data: result,
                responseTime,
                recordCount: this.countRecords(result),
                capabilities: Array.from(instance.capabilities),
            };
        }
        catch (error) {
            this.updateInstanceMetrics(instance, Date.now() - startTime, false);
            return {
                instanceId: instance.id,
                instanceName: instance.name,
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime,
            };
        }
        finally {
            instance.activeQueries--;
        }
    }
    /**
     * Get instances that should be queried based on access control
     */
    getTargetInstances(requestedInstances, query, userId, userRole) {
        let candidates = Array.from(this.connectedInstances.values());
        // Filter by specific instances if requested
        if (requestedInstances.length > 0) {
            candidates = candidates.filter((instance) => requestedInstances.includes(instance.id) ||
                requestedInstances.includes(instance.name));
        }
        // Filter by health status
        candidates = candidates.filter((instance) => {
            const status = this.connectionStatus.get(instance.id);
            return status?.healthy !== false;
        });
        // Apply access control
        candidates = candidates.filter((instance) => {
            return this.checkInstanceAccess(instance, userId, userRole, query);
        });
        // Filter by query capabilities
        candidates = candidates.filter((instance) => {
            return this.instanceSupportsQuery(instance, query);
        });
        return candidates;
    }
    /**
     * Check if user has access to query a specific instance
     */
    checkInstanceAccess(instance, userId, userRole, query) {
        // Public instances are always accessible
        if (instance.accessLevel === "public") {
            return true;
        }
        // Check ACL rules for this instance
        const acl = this.accessControlList.get(instance.id);
        if (acl) {
            return acl.checkAccess(userId, userRole, query);
        }
        // Default access control by role
        switch (instance.accessLevel) {
            case "restricted":
                return ["admin", "lead", "analyst"].includes(userRole);
            case "private":
                return ["admin"].includes(userRole);
            default:
                return false;
        }
    }
    /**
     * Check if instance supports the query type
     */
    instanceSupportsQuery(instance, query) {
        // Extract query requirements
        const requirements = this.extractQueryRequirements(query);
        // Check if instance has required capabilities
        for (const requirement of requirements) {
            if (!instance.capabilities.has(requirement)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Transform query for specific instance
     */
    transformQueryForInstance(query, instance) {
        // Start with the base query
        let transformedQuery = { ...query };
        const variables = { ...(query.variables || {}) };
        // Apply instance-specific transformations
        if (instance.capabilities.has("geo_search")) {
            // Instance supports geospatial queries
            transformedQuery = this.addGeoCapabilities(transformedQuery);
        }
        if (instance.capabilities.has("temporal_analysis")) {
            // Instance supports time-based filtering
            transformedQuery = this.addTemporalCapabilities(transformedQuery);
        }
        if (instance.capabilities.has("sentiment_analysis")) {
            // Instance can provide sentiment data
            transformedQuery = this.addSentimentFields(transformedQuery);
        }
        return {
            graphql: transformedQuery.graphql,
            variables,
        };
    }
    /**
     * Process and aggregate results from multiple instances
     */
    processQueryResults(results, instances, aggregateResults) {
        const successful = [];
        const failed = [];
        const aggregated = {
            nodes: [],
            edges: [],
            analytics: {},
            metadata: {
                totalRecords: 0,
                instancesQueried: instances.length,
                successfulInstances: 0,
                failedInstances: 0,
            },
        };
        results.forEach((result, index) => {
            const instance = instances[index];
            if (result.status === "fulfilled" && result.value.success) {
                successful.push(result.value);
                aggregated.metadata.successfulInstances++;
                aggregated.metadata.totalRecords += result.value.recordCount || 0;
                if (aggregateResults) {
                    this.mergeResultData(aggregated, result.value.data, instance);
                }
            }
            else {
                const errorResult = result.status === "fulfilled"
                    ? result.value
                    : {
                        instanceId: instance.id,
                        instanceName: instance.name,
                        success: false,
                        error: result.reason?.message || "Unknown error",
                    };
                failed.push(errorResult);
                aggregated.metadata.failedInstances++;
            }
        });
        // Apply deduplication if aggregating
        if (aggregateResults) {
            aggregated.nodes = this.deduplicateNodes(aggregated.nodes);
            aggregated.edges = this.deduplicateEdges(aggregated.edges);
        }
        return {
            successful,
            failed,
            aggregated: aggregateResults ? aggregated : null,
            summary: {
                totalInstances: instances.length,
                successfulInstances: aggregated.metadata.successfulInstances,
                failedInstances: aggregated.metadata.failedInstances,
                totalRecords: aggregated.metadata.totalRecords,
                avgResponseTime: this.calculateAverageResponseTime(successful),
            },
        };
    }
    /**
     * Merge data from one instance into aggregated results
     */
    mergeResultData(aggregated, instanceData, instance) {
        // Add instance metadata to each record
        const instanceMeta = {
            sourceInstance: instance.id,
            sourceName: instance.name,
            capabilities: Array.from(instance.capabilities),
        };
        // Merge nodes
        if (instanceData.nodes) {
            instanceData.nodes.forEach((node) => {
                aggregated.nodes.push({
                    ...node,
                    _federation: instanceMeta,
                });
            });
        }
        // Merge edges
        if (instanceData.edges) {
            instanceData.edges.forEach((edge) => {
                aggregated.edges.push({
                    ...edge,
                    _federation: instanceMeta,
                });
            });
        }
        // Merge analytics
        if (instanceData.analytics) {
            aggregated.analytics[instance.id] = instanceData.analytics;
        }
    }
    /**
     * Deduplicate nodes based on ID or content hash
     */
    deduplicateNodes(nodes) {
        const seen = new Set();
        const deduplicated = [];
        for (const node of nodes) {
            const key = this.generateNodeKey(node);
            if (!seen.has(key)) {
                seen.add(key);
                deduplicated.push(node);
            }
            else {
                // Merge metadata from duplicate
                const existing = deduplicated.find((n) => this.generateNodeKey(n) === key);
                if (existing && node._federation) {
                    existing._federation = {
                        ...existing._federation,
                        duplicateInstances: [
                            ...(existing._federation.duplicateInstances || []),
                            node._federation.sourceInstance,
                        ],
                    };
                }
            }
        }
        return deduplicated;
    }
    /**
     * Generate unique key for node deduplication
     */
    generateNodeKey(node) {
        // Use external ID if available, otherwise hash content
        if (node.externalId) {
            return `external:${node.externalId}`;
        }
        if (node.id) {
            return `id:${node.id}`;
        }
        // Generate content hash
        const content = JSON.stringify({
            label: node.label,
            type: node.type,
            properties: node.properties,
        });
        return `hash:${this.generateHash(content)}`;
    }
    /**
     * Health monitoring for connected instances
     */
    initializeHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, 60000); // Check every minute
    }
    /**
     * Perform health check on all connected instances
     */
    async performHealthChecks() {
        const promises = Array.from(this.connectedInstances.values()).map((instance) => this.performHealthCheck(instance.endpoint, instance.apiKey)
            .then((result) => ({ instanceId: instance.id, ...result }))
            .catch((error) => ({
            instanceId: instance.id,
            healthy: false,
            error: error.message,
        })));
        const results = await Promise.allSettled(promises);
        results.forEach((result) => {
            if (result.status === "fulfilled") {
                this.connectionStatus.set(result.value.instanceId, {
                    healthy: result.value.healthy,
                    lastCheck: new Date(),
                    error: result.value.error,
                });
            }
        });
    }
    /**
     * Perform health check on a specific instance
     */
    async performHealthCheck(endpoint, apiKey) {
        try {
            const response = await axios.get(`${this.normalizeEndpoint(endpoint)}/health`, {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 5000,
            });
            return {
                healthy: response.status === 200,
                version: response.data.version,
                features: response.data.features,
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date(),
            };
        }
    }
    /**
     * Get federation statistics
     */
    getFederationStats() {
        const instanceStats = Array.from(this.connectedInstances.values()).map((instance) => ({
            id: instance.id,
            name: instance.name,
            endpoint: instance.endpoint,
            accessLevel: instance.accessLevel,
            capabilities: Array.from(instance.capabilities),
            totalQueries: instance.totalQueries,
            successRate: instance.successRate,
            avgResponseTime: instance.avgResponseTime,
            healthy: this.connectionStatus.get(instance.id)?.healthy,
            lastHealthCheck: this.connectionStatus.get(instance.id)?.lastCheck,
        }));
        return {
            connectedInstances: this.connectedInstances.size,
            healthyInstances: instanceStats.filter((i) => i.healthy).length,
            metrics: this.federationMetrics,
            instances: instanceStats,
            cacheSize: this.queryCache.size,
        };
    }
    // Helper methods
    normalizeEndpoint(endpoint) {
        return endpoint.replace(/\/$/, ""); // Remove trailing slash
    }
    generateRequestId() {
        return `fed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateCacheKey(query, instances) {
        const content = JSON.stringify({ query, instances: instances.sort() });
        return this.generateHash(content);
    }
    generateHash(content) {
        // Simple hash function - in production use crypto
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }
    sanitizeQueryForLogging(query) {
        // Remove sensitive data from query for logging
        const sanitized = { ...query };
        delete sanitized.apiKey;
        delete sanitized.token;
        if (sanitized.variables) {
            delete sanitized.variables.password;
            delete sanitized.variables.token;
        }
        return sanitized;
    }
    validateQuery(query) {
        if (!query || typeof query !== "object") {
            throw new Error("Query must be an object");
        }
        if (!query.graphql || typeof query.graphql !== "string") {
            throw new Error("Query must contain a GraphQL string");
        }
    }
    extractQueryRequirements(query) {
        const requirements = [];
        const queryString = query.graphql.toLowerCase();
        // Detect required capabilities from query
        if (queryString.includes("geospatial") ||
            queryString.includes("location")) {
            requirements.push("geo_search");
        }
        if (queryString.includes("temporal") || queryString.includes("timerange")) {
            requirements.push("temporal_analysis");
        }
        if (queryString.includes("sentiment")) {
            requirements.push("sentiment_analysis");
        }
        if (queryString.includes("analytics") ||
            queryString.includes("centrality")) {
            requirements.push("graph_analytics");
        }
        return requirements;
    }
    countRecords(result) {
        let count = 0;
        if (result.nodes)
            count += result.nodes.length;
        if (result.edges)
            count += result.edges.length;
        return count;
    }
    updateInstanceMetrics(instance, responseTime, success) {
        instance.totalQueries++;
        if (success) {
            instance.avgResponseTime =
                (instance.avgResponseTime * (instance.totalQueries - 1) +
                    responseTime) /
                    instance.totalQueries;
        }
        // Calculate success rate
        const successfulQueries = Math.round((instance.successRate * (instance.totalQueries - 1)) / 100);
        instance.successRate =
            ((successfulQueries + (success ? 1 : 0)) / instance.totalQueries) * 100;
    }
    updateFederationMetrics(startTime, results) {
        const latency = Date.now() - startTime;
        this.federationMetrics.avgLatency =
            (this.federationMetrics.avgLatency *
                (this.federationMetrics.totalQueries - 1) +
                latency) /
                this.federationMetrics.totalQueries;
        const successCount = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
        if (successCount > 0) {
            this.federationMetrics.successfulQueries++;
        }
        results.forEach((result) => {
            if (result.status === "fulfilled" && result.value.instanceId) {
                this.federationMetrics.instancesQueried.add(result.value.instanceId);
            }
        });
    }
    calculateAverageResponseTime(successfulResults) {
        if (successfulResults.length === 0)
            return 0;
        const totalTime = successfulResults.reduce((sum, result) => sum + result.responseTime, 0);
        return totalTime / successfulResults.length;
    }
    // Cleanup
    destroy() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.queryCache.clear();
    }
}
module.exports = FederatedSearchService;
//# sourceMappingURL=FederatedSearchService.js.map