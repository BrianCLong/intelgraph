const { getNeo4jDriver } = require("../config/database");
const logger = require("../utils/logger");
class GraphAnalyticsService {
    constructor() {
        this.logger = logger;
    }
    /**
     * Calculate basic graph metrics
     */
    async calculateBasicMetrics(investigationId = null) {
        const session = this.driver.session();
        try {
            const constraints = investigationId
                ? "WHERE n.investigation_id = $investigationId AND m.investigation_id = $investigationId"
                : "";
            const params = investigationId ? { investigationId } : {};
            const query = `
        MATCH (n)
        ${constraints.replace("m.investigation_id", "n.investigation_id")}
        WITH count(n) as nodeCount
        MATCH ()-[r]->()
        ${constraints.replace("n.investigation_id", "r.investigation_id")}
        WITH nodeCount, count(r) as edgeCount
        MATCH (n)-[r]->()
        ${constraints.replace("m.investigation_id", "n.investigation_id")}
        WITH nodeCount, edgeCount, n.id as nodeId, count(r) as degree
        RETURN 
          nodeCount,
          edgeCount,
          avg(degree) as avgDegree,
          max(degree) as maxDegree,
          min(degree) as minDegree,
          stdev(degree) as degreeStdDev
      `;
            const result = await session.run(query, params);
            if (result.records.length === 0) {
                return {
                    nodeCount: 0,
                    edgeCount: 0,
                    avgDegree: 0,
                    maxDegree: 0,
                    minDegree: 0,
                    degreeStdDev: 0,
                    density: 0,
                };
            }
            const record = result.records[0];
            const nodeCount = record.get("nodeCount").toNumber();
            const edgeCount = record.get("edgeCount").toNumber();
            const avgDegree = record.get("avgDegree") || 0;
            const maxDegree = record.get("maxDegree").toNumber();
            const minDegree = record.get("minDegree").toNumber();
            const degreeStdDev = record.get("degreeStdDev") || 0;
            // Calculate graph density
            const maxPossibleEdges = nodeCount * (nodeCount - 1);
            const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
            return {
                nodeCount,
                edgeCount,
                avgDegree,
                maxDegree,
                minDegree,
                degreeStdDev,
                density,
            };
        }
        catch (error) {
            this.logger.error("Error calculating basic metrics:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Calculate centrality measures
     */
    async calculateCentralityMeasures(investigationId = null, limit = 50) {
        const session = this.driver.session();
        try {
            const constraints = investigationId
                ? "WHERE n.investigation_id = $investigationId"
                : "";
            const params = investigationId ? { investigationId, limit } : { limit };
            // Degree Centrality
            const degreeQuery = `
        MATCH (n)
        ${constraints}
        OPTIONAL MATCH (n)-[r]-()
        WITH n, count(r) as degree
        RETURN n.id as nodeId, n.label as label, degree
        ORDER BY degree DESC
        LIMIT $limit
      `;
            // Betweenness Centrality (approximation)
            const betweennessQuery = `
        MATCH (n)
        ${constraints}
        WITH n
        MATCH path = allShortestPaths((n)-[*]-(m))
        WHERE n <> m ${investigationId ? "AND m.investigation_id = $investigationId" : ""}
        WITH n, length(path) as pathLength, count(path) as pathCount
        RETURN n.id as nodeId, n.label as label, 
               avg(pathLength) as avgPathLength,
               sum(pathCount) as totalPaths
        ORDER BY totalPaths DESC
        LIMIT $limit
      `;
            // Closeness Centrality
            const closenessQuery = `
        MATCH (n)
        ${constraints}
        WITH n
        MATCH path = shortestPath((n)-[*]-(m))
        WHERE n <> m ${investigationId ? "AND m.investigation_id = $investigationId" : ""}
        WITH n, avg(length(path)) as avgDistance
        RETURN n.id as nodeId, n.label as label,
               CASE WHEN avgDistance > 0 THEN 1.0/avgDistance ELSE 0 END as closeness
        ORDER BY closeness DESC
        LIMIT $limit
      `;
            const [degreeResult, betweennessResult, closenessResult] = await Promise.all([
                session.run(degreeQuery, params),
                session.run(betweennessQuery, params),
                session.run(closenessQuery, params),
            ]);
            return {
                degreeCentrality: degreeResult.records.map((record) => ({
                    nodeId: record.get("nodeId"),
                    label: record.get("label"),
                    score: record.get("degree").toNumber(),
                })),
                betweennessCentrality: betweennessResult.records.map((record) => ({
                    nodeId: record.get("nodeId"),
                    label: record.get("label"),
                    avgPathLength: record.get("avgPathLength"),
                    totalPaths: record.get("totalPaths").toNumber(),
                })),
                closenessCentrality: closenessResult.records.map((record) => ({
                    nodeId: record.get("nodeId"),
                    label: record.get("label"),
                    score: record.get("closeness"),
                })),
            };
        }
        catch (error) {
            this.logger.error("Error calculating centrality measures:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find communities using label propagation algorithm
     */
    async detectCommunities(investigationId = null) {
        const session = this.driver.session();
        try {
            const constraints = investigationId
                ? "WHERE n.investigation_id = $investigationId AND m.investigation_id = $investigationId"
                : "";
            const params = investigationId ? { investigationId } : {};
            // Simplified community detection using connected components
            const query = `
        MATCH (n)
        ${constraints.replace("AND m.investigation_id", "AND n.investigation_id")}
        WITH n
        MATCH path = (n)-[*]-(m)
        ${constraints}
        WITH n, collect(DISTINCT m.id) as connectedNodes
        WITH n, connectedNodes, size(connectedNodes) as componentSize
        RETURN n.id as nodeId, n.label as label, connectedNodes, componentSize
        ORDER BY componentSize DESC
      `;
            const result = await session.run(query, params);
            // Group nodes by their connected components
            const communities = new Map();
            result.records.forEach((record) => {
                const nodeId = record.get("nodeId");
                const label = record.get("label");
                const connectedNodes = record.get("connectedNodes");
                const componentSize = record.get("componentSize").toNumber();
                // Create a unique key for the component
                const componentKey = connectedNodes.sort().join(",");
                if (!communities.has(componentKey)) {
                    communities.set(componentKey, {
                        id: communities.size + 1,
                        size: componentSize,
                        nodes: [],
                    });
                }
                communities.get(componentKey).nodes.push({
                    nodeId,
                    label,
                });
            });
            return Array.from(communities.values())
                .sort((a, b) => b.size - a.size)
                .slice(0, 20); // Return top 20 communities
        }
        catch (error) {
            this.logger.error("Error detecting communities:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find shortest paths between nodes
     */
    async findShortestPaths(sourceId, targetId, maxLength = 6) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH (source {id: $sourceId}), (target {id: $targetId})
        MATCH path = allShortestPaths((source)-[*1..${maxLength}]-(target))
        RETURN path, length(path) as pathLength
        ORDER BY pathLength
        LIMIT 10
      `;
            const result = await session.run(query, { sourceId, targetId });
            return result.records.map((record) => {
                const path = record.get("path");
                const pathLength = record.get("pathLength").toNumber();
                return {
                    length: pathLength,
                    nodes: path.segments
                        .map((segment) => ({
                        id: segment.start.properties.id,
                        label: segment.start.properties.label,
                        type: segment.start.labels[0],
                    }))
                        .concat([
                        {
                            id: path.segments[path.segments.length - 1].end.properties.id,
                            label: path.segments[path.segments.length - 1].end.properties.label,
                            type: path.segments[path.segments.length - 1].end.labels[0],
                        },
                    ]),
                    relationships: path.segments.map((segment) => ({
                        type: segment.relationship.type,
                        properties: segment.relationship.properties,
                    })),
                };
            });
        }
        catch (error) {
            this.logger.error("Error finding shortest paths:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Analyze node importance using PageRank algorithm
     */
    async calculatePageRank(investigationId = null, iterations = 20, dampingFactor = 0.85) {
        const session = this.driver.session();
        try {
            const constraints = investigationId
                ? "WHERE n.investigation_id = $investigationId AND m.investigation_id = $investigationId"
                : "";
            const params = investigationId ? { investigationId } : {};
            // Get all nodes and their connections
            const graphQuery = `
        MATCH (n)-[r]->(m)
        ${constraints}
        RETURN n.id as sourceId, m.id as targetId, n.label as sourceLabel, m.label as targetLabel
      `;
            const graphResult = await session.run(graphQuery, params);
            if (graphResult.records.length === 0) {
                return [];
            }
            // Build adjacency structure
            const nodes = new Set();
            const edges = [];
            graphResult.records.forEach((record) => {
                const sourceId = record.get("sourceId");
                const targetId = record.get("targetId");
                const sourceLabel = record.get("sourceLabel");
                const targetLabel = record.get("targetLabel");
                nodes.add(sourceId);
                nodes.add(targetId);
                edges.push({ source: sourceId, target: targetId });
            });
            const nodeArray = Array.from(nodes);
            const nodeCount = nodeArray.length;
            if (nodeCount === 0)
                return [];
            // Initialize PageRank values
            let pageRank = {};
            const newPageRank = {};
            nodeArray.forEach((nodeId) => {
                pageRank[nodeId] = 1.0 / nodeCount;
            });
            // Build outbound links map
            const outboundLinks = {};
            nodeArray.forEach((nodeId) => {
                outboundLinks[nodeId] = [];
            });
            edges.forEach((edge) => {
                outboundLinks[edge.source].push(edge.target);
            });
            // Build inbound links map
            const inboundLinks = {};
            nodeArray.forEach((nodeId) => {
                inboundLinks[nodeId] = [];
            });
            edges.forEach((edge) => {
                inboundLinks[edge.target].push(edge.source);
            });
            // Iterate PageRank algorithm
            for (let iter = 0; iter < iterations; iter++) {
                nodeArray.forEach((nodeId) => {
                    let sum = 0;
                    inboundLinks[nodeId].forEach((inboundNodeId) => {
                        const outboundCount = outboundLinks[inboundNodeId].length;
                        if (outboundCount > 0) {
                            sum += pageRank[inboundNodeId] / outboundCount;
                        }
                    });
                    newPageRank[nodeId] =
                        (1 - dampingFactor) / nodeCount + dampingFactor * sum;
                });
                pageRank = { ...newPageRank };
            }
            // Get node labels
            const labelQuery = `
        MATCH (n)
        WHERE n.id IN $nodeIds ${investigationId ? "AND n.investigation_id = $investigationId" : ""}
        RETURN n.id as nodeId, n.label as label
      `;
            const labelResult = await session.run(labelQuery, {
                nodeIds: nodeArray,
                ...(investigationId && { investigationId }),
            });
            const nodeLabels = {};
            labelResult.records.forEach((record) => {
                nodeLabels[record.get("nodeId")] = record.get("label");
            });
            // Return sorted results
            return nodeArray
                .map((nodeId) => ({
                nodeId,
                label: nodeLabels[nodeId] || nodeId,
                pageRank: pageRank[nodeId],
            }))
                .sort((a, b) => b.pageRank - a.pageRank)
                .slice(0, 50);
        }
        catch (error) {
            this.logger.error("Error calculating PageRank:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Analyze relationship patterns
     */
    async analyzeRelationshipPatterns(investigationId = null) {
        const session = this.driver.session();
        try {
            const constraints = investigationId
                ? "WHERE r.investigation_id = $investigationId"
                : "";
            const params = investigationId ? { investigationId } : {};
            const query = `
        MATCH ()-[r]->()
        ${constraints}
        WITH type(r) as relationshipType, count(r) as frequency
        RETURN relationshipType, frequency
        ORDER BY frequency DESC
      `;
            const result = await session.run(query, params);
            const patterns = result.records.map((record) => ({
                relationshipType: record.get("relationshipType"),
                frequency: record.get("frequency").toNumber(),
            }));
            const totalRelationships = patterns.reduce((sum, p) => sum + p.frequency, 0);
            return {
                patterns: patterns.map((p) => ({
                    ...p,
                    percentage: (p.frequency / totalRelationships) * 100,
                })),
                totalRelationships,
                uniqueTypes: patterns.length,
            };
        }
        catch (error) {
            this.logger.error("Error analyzing relationship patterns:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find anomalous nodes or relationships
     */
    async detectAnomalies(investigationId = null) {
        const session = this.driver.session();
        try {
            const constraints = investigationId
                ? "WHERE n.investigation_id = $investigationId AND m.investigation_id = $investigationId"
                : "";
            const params = investigationId ? { investigationId } : {};
            // Find nodes with unusually high degree
            const highDegreeQuery = `
        MATCH (n)-[r]-(m)
        ${constraints}
        WITH n, count(r) as degree
        WITH collect(degree) as degrees
        WITH degrees, 
             reduce(sum = 0, d in degrees | sum + d) / size(degrees) as avgDegree,
             reduce(sum = 0, d in degrees | sum + (d - reduce(avg = 0, x in degrees | avg + x) / size(degrees))^2) / size(degrees) as variance
        WITH avgDegree, sqrt(variance) as stdDev
        MATCH (n)-[r]-(m)
        ${constraints}
        WITH n, count(r) as degree, avgDegree, stdDev
        WHERE degree > avgDegree + 2 * stdDev
        RETURN n.id as nodeId, n.label as label, degree, avgDegree, stdDev
        ORDER BY degree DESC
        LIMIT 20
      `;
            // Find isolated nodes
            const isolatedQuery = `
        MATCH (n)
        ${constraints.replace("AND m.investigation_id", "AND n.investigation_id")}
        WHERE NOT (n)-[]-()
        RETURN n.id as nodeId, n.label as label
        LIMIT 50
      `;
            // Find nodes with unusual relationship diversity
            const diversityQuery = `
        MATCH (n)-[r]-(m)
        ${constraints}
        WITH n, collect(DISTINCT type(r)) as relationshipTypes
        WITH n, relationshipTypes, size(relationshipTypes) as diversity
        WHERE diversity > 5
        RETURN n.id as nodeId, n.label as label, diversity, relationshipTypes
        ORDER BY diversity DESC
        LIMIT 20
      `;
            const [highDegreeResult, isolatedResult, diversityResult] = await Promise.all([
                session.run(highDegreeQuery, params),
                session.run(isolatedQuery, params),
                session.run(diversityQuery, params),
            ]);
            return {
                highDegreeNodes: highDegreeResult.records.map((record) => ({
                    nodeId: record.get("nodeId"),
                    label: record.get("label"),
                    degree: record.get("degree").toNumber(),
                    avgDegree: record.get("avgDegree"),
                    standardDeviations: (record.get("degree").toNumber() - record.get("avgDegree")) /
                        record.get("stdDev"),
                })),
                isolatedNodes: isolatedResult.records.map((record) => ({
                    nodeId: record.get("nodeId"),
                    label: record.get("label"),
                })),
                diverseNodes: diversityResult.records.map((record) => ({
                    nodeId: record.get("nodeId"),
                    label: record.get("label"),
                    diversity: record.get("diversity").toNumber(),
                    relationshipTypes: record.get("relationshipTypes"),
                })),
            };
        }
        catch (error) {
            this.logger.error("Error detecting anomalies:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Generate comprehensive graph analysis report
     */
    async generateAnalysisReport(investigationId = null) {
        try {
            const [basicMetrics, centrality, communities, pageRank, relationshipPatterns, anomalies,] = await Promise.all([
                this.calculateBasicMetrics(investigationId),
                this.calculateCentralityMeasures(investigationId),
                this.detectCommunities(investigationId),
                this.calculatePageRank(investigationId),
                this.analyzeRelationshipPatterns(investigationId),
                this.detectAnomalies(investigationId),
            ]);
            return {
                investigationId,
                timestamp: new Date(),
                basicMetrics,
                centrality,
                communities: communities.slice(0, 10),
                topNodes: pageRank.slice(0, 20),
                relationshipPatterns,
                anomalies,
                insights: this.generateInsights({
                    basicMetrics,
                    centrality,
                    communities,
                    pageRank,
                    relationshipPatterns,
                    anomalies,
                }),
            };
        }
        catch (error) {
            this.logger.error("Error generating analysis report:", error);
            throw error;
        }
    }
    /**
     * Generate insights from analysis results
     */
    generateInsights(analysisData) {
        const insights = [];
        const { basicMetrics, centrality, communities, pageRank, relationshipPatterns, anomalies, } = analysisData;
        // Network size insights
        if (basicMetrics.nodeCount > 1000) {
            insights.push({
                type: "network_size",
                severity: "info",
                message: `Large network detected with ${basicMetrics.nodeCount} entities and ${basicMetrics.edgeCount} relationships.`,
            });
        }
        // Density insights
        if (basicMetrics.density > 0.7) {
            insights.push({
                type: "density",
                severity: "warning",
                message: `High network density (${(basicMetrics.density * 100).toFixed(1)}%) suggests many interconnections. Consider filtering or clustering.`,
            });
        }
        else if (basicMetrics.density < 0.1) {
            insights.push({
                type: "density",
                severity: "info",
                message: `Low network density (${(basicMetrics.density * 100).toFixed(1)}%) indicates sparse connections. Look for key bridges.`,
            });
        }
        // Central node insights
        if (centrality.degreeCentrality.length > 0 &&
            centrality.degreeCentrality[0].score > basicMetrics.avgDegree * 3) {
            insights.push({
                type: "central_node",
                severity: "high",
                message: `Entity "${centrality.degreeCentrality[0].label}" appears to be a critical hub with ${centrality.degreeCentrality[0].score} connections.`,
            });
        }
        // Community insights
        if (communities.length > 1) {
            const largestCommunity = communities[0];
            insights.push({
                type: "communities",
                severity: "info",
                message: `${communities.length} distinct communities detected. Largest contains ${largestCommunity.size} entities.`,
            });
        }
        // Anomaly insights
        if (anomalies.highDegreeNodes.length > 0) {
            insights.push({
                type: "anomaly",
                severity: "warning",
                message: `${anomalies.highDegreeNodes.length} entities with unusually high connectivity detected. May warrant investigation.`,
            });
        }
        if (anomalies.isolatedNodes.length > 0) {
            insights.push({
                type: "isolation",
                severity: "info",
                message: `${anomalies.isolatedNodes.length} isolated entities found. Consider their relevance to the investigation.`,
            });
        }
        // Relationship pattern insights
        if (relationshipPatterns.patterns.length > 0) {
            const dominantPattern = relationshipPatterns.patterns[0];
            if (dominantPattern.percentage > 40) {
                insights.push({
                    type: "relationship_pattern",
                    severity: "info",
                    message: `"${dominantPattern.relationshipType}" relationships dominate (${dominantPattern.percentage.toFixed(1)}% of all connections).`,
                });
            }
        }
        return insights;
    }
    /**
     * Initialize Neo4j driver
     */
    setDriver(driver) {
        this.driver = driver;
    }
    /**
     * Calculate graph clustering coefficient
     */
    async calculateClusteringCoefficient(investigationId = null) {
        const session = this.driver.session();
        try {
            const constraints = investigationId
                ? "WHERE n.investigation_id = $investigationId"
                : "";
            const params = investigationId ? { investigationId } : {};
            const query = `
        MATCH (n)
        ${constraints}
        OPTIONAL MATCH (n)-[]-(neighbor1)-[]-(neighbor2)-[]-(n)
        WHERE neighbor1 <> neighbor2
        WITH n, count(DISTINCT neighbor1) as neighbors, count(DISTINCT [neighbor1, neighbor2]) as triangles
        WITH n, neighbors, triangles,
             CASE WHEN neighbors > 1 
                  THEN toFloat(triangles) / (neighbors * (neighbors - 1))
                  ELSE 0 END as localClustering
        RETURN avg(localClustering) as globalClustering,
               collect({nodeId: n.id, clustering: localClustering}) as localClusterings
      `;
            const result = await session.run(query, params);
            if (result.records.length === 0) {
                return { globalClustering: 0, localClusterings: [] };
            }
            const record = result.records[0];
            return {
                globalClustering: record.get("globalClustering") || 0,
                localClusterings: record.get("localClusterings").map((item) => ({
                    nodeId: item.nodeId,
                    clustering: item.clustering,
                })),
            };
        }
        catch (error) {
            this.logger.error("Error calculating clustering coefficient:", error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
}
module.exports = GraphAnalyticsService;
//# sourceMappingURL=GraphAnalyticsService.js.map