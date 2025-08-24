"use strict";
/**
 * Entity Model Service
 * Provides high-level entity modeling operations for Neo4j
 * Handles complex queries, analytics, and graph operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { getNeo4jDriver } = require('../config/database');
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class EntityModelService {
    constructor() {
        this.driver = null;
    }
    /**
     * Initialize service with database connection
     */
    initialize() {
        this.driver = getNeo4jDriver();
    }
    /**
     * Get entity statistics for an investigation
     * @param {string} investigationId Investigation ID
     * @returns {Object} Statistics object
     */
    async getEntityStatistics(investigationId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e:Entity {investigationId: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(other:Entity {investigationId: $investigationId})
        WITH e, count(DISTINCT r) as relationshipCount
        RETURN 
          count(e) as totalEntities,
          collect(DISTINCT e.type) as entityTypes,
          avg(e.confidence) as avgConfidence,
          min(e.createdAt) as oldestEntity,
          max(e.createdAt) as newestEntity,
          avg(relationshipCount) as avgRelationshipsPerEntity,
          apoc.map.groupByMulti(collect({type: e.type, confidence: e.confidence}), ['type']) as typeStats
      `, { investigationId });
            if (result.records.length === 0) {
                return {
                    totalEntities: 0,
                    entityTypes: [],
                    avgConfidence: 0,
                    avgRelationshipsPerEntity: 0
                };
            }
            const record = result.records[0];
            return {
                totalEntities: record.get('totalEntities').toNumber(),
                entityTypes: record.get('entityTypes'),
                avgConfidence: record.get('avgConfidence'),
                oldestEntity: record.get('oldestEntity'),
                newestEntity: record.get('newestEntity'),
                avgRelationshipsPerEntity: record.get('avgRelationshipsPerEntity'),
                typeStats: record.get('typeStats')
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find potential duplicate entities based on label similarity
     * @param {string} investigationId Investigation ID
     * @param {number} threshold Similarity threshold (0-1)
     * @returns {Array} Array of potential duplicates
     */
    async findPotentialDuplicates(investigationId, threshold = 0.8) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e1:Entity {investigationId: $investigationId})
        MATCH (e2:Entity {investigationId: $investigationId})
        WHERE e1.id < e2.id 
          AND e1.type = e2.type
          AND apoc.text.sorensenDiceSimilarity(toLower(e1.label), toLower(e2.label)) >= $threshold
        RETURN 
          e1.id as entity1Id,
          e1.label as entity1Label,
          e1.type as entityType,
          e2.id as entity2Id, 
          e2.label as entity2Label,
          apoc.text.sorensenDiceSimilarity(toLower(e1.label), toLower(e2.label)) as similarity
        ORDER BY similarity DESC
      `, { investigationId, threshold });
            return result.records.map(record => ({
                entity1: {
                    id: record.get('entity1Id'),
                    label: record.get('entity1Label'),
                    type: record.get('entityType')
                },
                entity2: {
                    id: record.get('entity2Id'),
                    label: record.get('entity2Label'),
                    type: record.get('entityType')
                },
                similarity: record.get('similarity')
            }));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find entities with high connectivity (potential hubs)
     * @param {string} investigationId Investigation ID
     * @param {number} minConnections Minimum number of connections
     * @returns {Array} Array of hub entities
     */
    async findHubEntities(investigationId, minConnections = 5) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e:Entity {investigationId: $investigationId})
        MATCH (e)-[r:RELATIONSHIP]-(other:Entity {investigationId: $investigationId})
        WITH e, count(DISTINCT r) as connectionCount, collect(DISTINCT other.type) as connectedTypes
        WHERE connectionCount >= $minConnections
        RETURN 
          e.id as entityId,
          e.label as label,
          e.type as type,
          connectionCount,
          connectedTypes,
          size(connectedTypes) as typesDiversity
        ORDER BY connectionCount DESC, typesDiversity DESC
      `, { investigationId, minConnections });
            return result.records.map(record => ({
                entityId: record.get('entityId'),
                label: record.get('label'),
                type: record.get('type'),
                connectionCount: record.get('connectionCount').toNumber(),
                connectedTypes: record.get('connectedTypes'),
                typesDiversity: record.get('typesDiversity').toNumber()
            }));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Find shortest path between two entities
     * @param {string} fromEntityId Starting entity ID
     * @param {string} toEntityId Target entity ID
     * @param {number} maxDepth Maximum path length
     * @returns {Object} Path information
     */
    async findShortestPath(fromEntityId, toEntityId, maxDepth = 6) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (start:Entity {id: $fromEntityId})
        MATCH (end:Entity {id: $toEntityId})
        MATCH path = shortestPath((start)-[*1..$maxDepth]-(end))
        WHERE ALL(r in relationships(path) WHERE type(r) = 'RELATIONSHIP')
        RETURN 
          path,
          length(path) as pathLength,
          [n in nodes(path) | {id: n.id, label: n.label, type: n.type}] as pathNodes,
          [r in relationships(path) | {id: r.id, type: r.type, confidence: r.confidence}] as pathRelationships
        ORDER BY pathLength
        LIMIT 1
      `, { fromEntityId, toEntityId, maxDepth });
            if (result.records.length === 0) {
                return null;
            }
            const record = result.records[0];
            return {
                pathLength: record.get('pathLength').toNumber(),
                nodes: record.get('pathNodes'),
                relationships: record.get('pathRelationships')
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get entity clustering information using community detection
     * @param {string} investigationId Investigation ID
     * @returns {Array} Array of communities/clusters
     */
    async getEntityClusters(investigationId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e:Entity {investigationId: $investigationId})
        MATCH (e)-[r:RELATIONSHIP]-(other:Entity {investigationId: $investigationId})
        WITH e, other, r.confidence as weight
        CALL gds.alpha.louvain.stream({
          nodeQuery: 'MATCH (e:Entity {investigationId: "' + $investigationId + '"}) RETURN id(e) as id',
          relationshipQuery: 'MATCH (e1:Entity {investigationId: "' + $investigationId + '"})-[r:RELATIONSHIP]-(e2:Entity {investigationId: "' + $investigationId + '"}) RETURN id(e1) as source, id(e2) as target, r.confidence as weight',
          weightProperty: 'weight'
        })
        YIELD nodeId, community
        MATCH (entity:Entity) WHERE id(entity) = nodeId
        RETURN 
          community,
          collect({id: entity.id, label: entity.label, type: entity.type}) as entities,
          count(*) as size
        ORDER BY size DESC
      `, { investigationId });
            return result.records.map(record => ({
                communityId: record.get('community').toNumber(),
                entities: record.get('entities'),
                size: record.get('size').toNumber()
            }));
        }
        catch (error) {
            // Fallback to simple clustering if GDS is not available
            logger_js_1.default.warn('GDS community detection not available, using simple clustering');
            return this.getSimpleEntityClusters(investigationId);
        }
        finally {
            await session.close();
        }
    }
    /**
     * Simple entity clustering fallback (without GDS)
     * @param {string} investigationId Investigation ID
     * @returns {Array} Array of clusters
     */
    async getSimpleEntityClusters(investigationId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (e:Entity {investigationId: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(connected:Entity {investigationId: $investigationId})
        WITH e, collect(DISTINCT connected.type) as connectedTypes, count(DISTINCT connected) as connectionCount
        WITH 
          CASE 
            WHEN 'PERSON' IN connectedTypes AND 'ORGANIZATION' IN connectedTypes THEN 'people-org'
            WHEN 'PERSON' IN connectedTypes THEN 'people'
            WHEN 'ORGANIZATION' IN connectedTypes THEN 'organization'
            WHEN connectionCount = 0 THEN 'isolated'
            ELSE 'other'
          END as cluster,
          e
        RETURN 
          cluster,
          collect({id: e.id, label: e.label, type: e.type}) as entities,
          count(*) as size
        ORDER BY size DESC
      `, { investigationId });
            return result.records.map(record => ({
                communityId: record.get('cluster'),
                entities: record.get('entities'),
                size: record.get('size').toNumber()
            }));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Validate entity model integrity
     * @param {string} investigationId Investigation ID (optional)
     * @returns {Object} Validation results
     */
    async validateModelIntegrity(investigationId = null) {
        const session = this.driver.session();
        try {
            const whereClause = investigationId ? '{investigationId: $investigationId}' : '';
            const params = investigationId ? { investigationId } : {};
            const result = await session.run(`
        // Check for orphaned relationships
        OPTIONAL MATCH ()-[r:RELATIONSHIP]-()
        WHERE NOT EXISTS((r)-[:CREATED_BY]-(:User))
        WITH count(r) as orphanedRelationships
        
        // Check for entities without required fields
        OPTIONAL MATCH (e:Entity ${whereClause})
        WHERE e.label IS NULL OR e.type IS NULL OR e.createdBy IS NULL
        WITH orphanedRelationships, count(e) as invalidEntities
        
        // Check for duplicate IDs
        MATCH (e:Entity ${whereClause})
        WITH orphanedRelationships, invalidEntities, e.id as id, count(*) as idCount
        WHERE idCount > 1
        WITH orphanedRelationships, invalidEntities, count(id) as duplicateIds
        
        // Check constraint violations
        OPTIONAL MATCH (e:Entity ${whereClause})
        WHERE e.type = 'EMAIL' AND NOT e.label =~ '.*@.*\\..*'
        WITH orphanedRelationships, invalidEntities, duplicateIds, count(e) as invalidEmails
        
        RETURN 
          orphanedRelationships,
          invalidEntities,
          duplicateIds,
          invalidEmails,
          (orphanedRelationships + invalidEntities + duplicateIds + invalidEmails) as totalIssues
      `, params);
            const record = result.records[0];
            return {
                isValid: record.get('totalIssues').toNumber() === 0,
                issues: {
                    orphanedRelationships: record.get('orphanedRelationships').toNumber(),
                    invalidEntities: record.get('invalidEntities').toNumber(),
                    duplicateIds: record.get('duplicateIds').toNumber(),
                    invalidEmails: record.get('invalidEmails').toNumber()
                },
                totalIssues: record.get('totalIssues').toNumber()
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get performance statistics for common queries
     * @param {string} investigationId Investigation ID
     * @returns {Object} Performance statistics
     */
    async getQueryPerformanceStats(investigationId) {
        const session = this.driver.session();
        try {
            const queries = [
                {
                    name: 'entity_by_type',
                    query: 'MATCH (e:Entity {investigationId: $investigationId, type: "PERSON"}) RETURN count(e)'
                },
                {
                    name: 'entity_relationships',
                    query: 'MATCH (e:Entity {investigationId: $investigationId})-[r:RELATIONSHIP]-() RETURN count(r)'
                },
                {
                    name: 'high_confidence_entities',
                    query: 'MATCH (e:Entity {investigationId: $investigationId}) WHERE e.confidence >= 0.8 RETURN count(e)'
                }
            ];
            const results = [];
            for (const queryInfo of queries) {
                const startTime = Date.now();
                const result = await session.run(queryInfo.query, { investigationId });
                const executionTime = Date.now() - startTime;
                results.push({
                    queryName: queryInfo.name,
                    executionTimeMs: executionTime,
                    resultCount: result.records[0].get(0).toNumber()
                });
            }
            return {
                investigationId,
                timestamp: new Date().toISOString(),
                queryStats: results
            };
        }
        finally {
            await session.close();
        }
    }
}
// Export singleton instance
const entityModelService = new EntityModelService();
module.exports = {
    EntityModelService,
    entityModelService
};
//# sourceMappingURL=EntityModelService.js.map