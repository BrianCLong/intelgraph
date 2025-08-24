"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_js_1 = require("../../db/neo4j.js");
const uuid_1 = require("uuid");
const subscriptions_js_1 = require("../subscriptions.js");
const withTenant_js_1 = require("../../middleware/withTenant.js");
const postgres_js_1 = require("../../db/postgres.js");
const axios_1 = __importDefault(require("axios")); // For calling ML service
const logger = logger.child({ name: 'entityResolvers' });
const driver = (0, neo4j_js_1.getNeo4jDriver)();
const entityResolvers = {
    Query: {
        entity: async (_, { id }, context) => {
            // Return mock data if database is not available
            if ((0, neo4j_js_1.isNeo4jMockMode)()) {
                return getMockEntity(id);
            }
            const session = driver.session();
            try {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                const result = await session.run("MATCH (n:Entity {id: $id, tenantId: $tenantId}) RETURN n", { id, tenantId });
                if (result.records.length === 0) {
                    return null;
                }
                const record = result.records[0].get("n");
                return {
                    id: record.properties.id,
                    type: record.labels[0], // Assuming the first label is the primary type
                    props: record.properties,
                    createdAt: record.properties.createdAt,
                    updatedAt: record.properties.updatedAt,
                };
            }
            catch (error) {
                logger.error({ error, id }, "Error fetching entity by ID");
                // Fallback to mock data if database connection fails
                logger.warn("Falling back to mock entity data");
                return getMockEntity(id);
            }
            finally {
                await session.close();
            }
        },
        entities: async (_, { type, q, limit, offset, }, context) => {
            // Return mock data if database is not available
            if ((0, neo4j_js_1.isNeo4jMockMode)()) {
                return getMockEntities(type, q, limit, offset);
            }
            const session = driver.session();
            try {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                let query = "MATCH (n:Entity) WHERE n.tenantId = $tenantId";
                const params = { tenantId };
                if (type) {
                    query += " AND n.type = $type";
                    params.type = type;
                }
                if (q) {
                    // Simple full-text search on properties
                    // For better performance, consider using a full-text search index.
                    // See: https://neo4j.com/docs/cypher-manual/current/indexes-for-full-text-search/
                    query +=
                        " AND (ANY(prop IN keys(n) WHERE toString(n[prop]) CONTAINS $q))";
                    params.q = q;
                }
                query += " RETURN n SKIP $offset LIMIT $limit";
                params.limit = limit;
                params.offset = offset;
                const result = await session.run(query, params);
                return result.records.map((record) => {
                    const entity = record.get("n");
                    return {
                        id: entity.properties.id,
                        type: entity.labels[0],
                        props: entity.properties,
                        createdAt: entity.properties.createdAt,
                        updatedAt: entity.properties.updatedAt,
                    };
                });
            }
            catch (error) {
                logger.error({ error, type, q, limit, offset }, "Error fetching entities");
                throw new Error(`Failed to fetch entities: ${error.message}`);
            }
            finally {
                await session.close();
            }
        },
        semanticSearch: async (_, { query, filters, limit, offset, }) => {
            const pgPool = (0, postgres_js_1.getPostgresPool)();
            const neo4jSession = driver.session();
            let pgClient;
            try {
                // 1. Get embedding for the query from ML service
                const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8081";
                const embeddingResponse = await axios_1.default.post(`${mlServiceUrl}/gnn/generate_embeddings`, {
                    graph_data: { nodes: [{ id: "query", features: [] }] }, // Dummy graph for query embedding
                    node_features: { query: [0.0] }, // Placeholder for actual query features
                    model_name: "text_embedding_model", // Assuming a text embedding model in ML service
                    job_id: `semantic-search-${Date.now()}`,
                });
                const queryEmbedding = embeddingResponse.data.node_embeddings.query;
                if (!queryEmbedding || queryEmbedding.length === 0) {
                    throw new Error("Failed to get embedding for query from ML service.");
                }
                // 2. Perform vector similarity search in PostgreSQL with filters
                pgClient = await pgPool.connect();
                const embeddingVectorString = `[${queryEmbedding.join(",")}]`;
                let pgQuery = `SELECT ee.entity_id FROM entity_embeddings ee`;
                const pgQueryParams = [embeddingVectorString];
                let paramIndex = 2; // Start index for additional parameters
                // Add filters for type and props
                if (type || props) {
                    pgQuery += ` JOIN entities e ON ee.entity_id = e.id WHERE 1=1`; // Assuming 'entities' table exists with 'id' and 'type'
                    if (type) {
                        pgQuery += ` AND e.type = ${paramIndex}`;
                        pgQueryParams.push(type);
                        paramIndex++;
                    }
                    if (props) {
                        // This is a simplified example. Real JSONB querying would be more complex.
                        // Assuming props is a flat object and we're checking for existence of keys/values.
                        for (const key in props) {
                            pgQuery += ` AND e.props->>'${key}' = ${paramIndex}`;
                            pgQueryParams.push(props[key]);
                            paramIndex++;
                        }
                    }
                }
                pgQuery += ` ORDER BY ee.embedding <-> $1 LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`;
                pgQueryParams.push(limit);
                pgQueryParams.push(offset);
                const pgResult = await pgClient.query(pgQuery, pgQueryParams);
                const entityIds = pgResult.rows.map((row) => row.entity_id);
                if (entityIds.length === 0) {
                    return [];
                }
                // 3. Fetch corresponding entities from Neo4j
                const session = driver.session();
                try {
                    const searchService = new (await Promise.resolve().then(() => __importStar(require("../../services/SemanticSearchService.js")))).default();
                    const docs = await searchService.search(query, filters || {}, limit + offset);
                    const sliced = docs.slice(offset);
                    const ids = sliced.map((d) => d.metadata.graphId).filter(Boolean);
                    if (ids.length === 0)
                        return [];
                    const result = await session.run(`MATCH (n:Entity) WHERE n.id IN $ids RETURN n`, { ids });
                    const entityMap = new Map();
                    result.records.forEach((record) => {
                        const entity = record.get("n");
                        entityMap.set(entity.properties.id, {
                            id: entity.properties.id,
                            type: entity.labels[0],
                            props: entity.properties,
                            createdAt: entity.properties.createdAt,
                            updatedAt: entity.properties.updatedAt,
                        });
                    });
                    return ids.map((id) => entityMap.get(id)).filter(Boolean);
                }
                finally {
                    await session.close();
                }
            }
            catch (error) {
                logger.error({ error, query, filters }, "Error performing semantic search with filters");
                throw new Error(`Failed to perform semantic search: ${error.message}`);
            }
            finally {
                await neo4jSession.close();
                if (pgClient)
                    pgClient.release();
            }
        },
    },
    Mutation: {
        createEntity: async (_, { input }, context) => {
            const session = driver.session();
            try {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                const id = (0, uuid_1.v4)();
                const createdAt = new Date().toISOString();
                const type = input.type;
                const props = {
                    ...input.props,
                    id,
                    createdAt,
                    updatedAt: createdAt,
                    tenantId,
                };
                const result = await session.run(`CREATE (n:Entity:${type} $props) RETURN n`, { props });
                const record = result.records[0].get("n");
                const entity = {
                    id: record.properties.id,
                    type: record.labels[0],
                    props: record.properties,
                    createdAt: record.properties.createdAt,
                    updatedAt: record.properties.updatedAt,
                    tenantId: record.properties.tenantId,
                };
                subscriptions_js_1.pubsub.publish((0, subscriptions_js_1.tenantEvent)(subscriptions_js_1.ENTITY_CREATED, tenantId), {
                    payload: entity,
                });
                return entity;
            }
            catch (error) {
                logger.error({ error, input }, "Error creating entity");
                throw new Error(`Failed to create entity: ${error.message}`);
            }
            finally {
                await session.close();
            }
        },
        updateEntity: async (_, { id, input, lastSeenTimestamp, }, context) => {
            const session = driver.session();
            try {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                const existing = await session.run("MATCH (n:Entity {id: $id, tenantId: $tenantId}) RETURN n", { id, tenantId });
                if (existing.records.length === 0) {
                    return null;
                }
                const current = existing.records[0].get("n").properties;
                if (current.updatedAt &&
                    new Date(current.updatedAt).toISOString() !==
                        new Date(lastSeenTimestamp).toISOString()) {
                    const err = new Error("Conflict: Entity has been modified");
                    err.extensions = { code: "CONFLICT", server: current };
                    throw err;
                }
                const updatedAt = new Date().toISOString();
                let query = "MATCH (n:Entity {id: $id, tenantId: $tenantId})";
                const params = { id, updatedAt, tenantId };
                if (input.type) {
                    // Remove old labels and add new type label
                    query += ` REMOVE n:${input.type} SET n:${input.type}`; // This is simplified
                }
                if (input.props) {
                    query += " SET n += $props, n.updatedAt = $updatedAt";
                    params.props = input.props;
                }
                else {
                    query += " SET n.updatedAt = $updatedAt";
                }
                query += " RETURN n";
                const result = await session.run(query, params);
                if (result.records.length === 0) {
                    return null; // Or throw an error if entity not found
                }
                const record = result.records[0].get("n");
                const entity = {
                    id: record.properties.id,
                    type: record.labels[0],
                    props: record.properties,
                    createdAt: record.properties.createdAt,
                    updatedAt: record.properties.updatedAt,
                    tenantId: record.properties.tenantId,
                };
                subscriptions_js_1.pubsub.publish((0, subscriptions_js_1.tenantEvent)(subscriptions_js_1.ENTITY_UPDATED, tenantId), {
                    payload: entity,
                });
                return entity;
            }
            catch (error) {
                logger.error({ error, id, input }, "Error updating entity");
                throw new Error(`Failed to update entity: ${error.message}`);
            }
            finally {
                await session.close();
            }
        },
        deleteEntity: async (_, { id }, context) => {
            const session = driver.session();
            try {
                const tenantId = (0, withTenant_js_1.requireTenant)(context);
                // Soft delete: set a 'deletedAt' timestamp
                const deletedAt = new Date().toISOString();
                const result = await session.run("MATCH (n:Entity {id: $id, tenantId: $tenantId}) SET n.deletedAt = $deletedAt RETURN n", { id, deletedAt, tenantId });
                if (result.records.length === 0) {
                    return false; // Or throw an error if entity not found
                }
                subscriptions_js_1.pubsub.publish((0, subscriptions_js_1.tenantEvent)(subscriptions_js_1.ENTITY_DELETED, tenantId), { payload: id });
                return true;
            }
            catch (error) {
                logger.error({ error, id }, "Error deleting entity");
                throw new Error(`Failed to delete entity: ${error.message}`);
            }
            finally {
                await session.close();
            }
        },
        linkEntities: async (_, { text }) => {
            try {
                const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8081";
                const response = await axios_1.default.post(`${mlServiceUrl}/nlp/entity_linking`, {
                    text: text,
                    job_id: `entity-linking-${Date.now()}`,
                });
                // The ML service returns a queued response, so we need to poll or use a webhook
                // For simplicity, this resolver will assume the ML service returns the result directly
                // In a real application, you'd handle the async nature (e.g., by returning a Job ID
                // and having a separate subscription for job completion).
                // Assuming the ML service returns the linked entities directly for this demo
                if (response.data.status === "completed" && response.data.entities) {
                    return response.data.entities.map((entity) => ({
                        text: entity.text,
                        label: entity.label,
                        startChar: entity.start_char,
                        endChar: entity.end_char,
                        entityId: entity.entity_id,
                    }));
                }
                else {
                    throw new Error(`ML service did not return completed entities: ${response.data.status}`);
                }
            }
            catch (error) {
                logger.error({ error, text }, "Error linking entities");
                throw new Error(`Failed to link entities: ${error.message}`);
            }
        },
        extractRelationships: async (_, { text, entities }, context) => {
            const neo4jSession = driver.session(); // Get Neo4j session
            try {
                const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8081";
                const response = await axios_1.default.post(`${mlServiceUrl}/nlp/relationship_extraction`, {
                    text: text,
                    entities: entities,
                    job_id: `relationship-extraction-${Date.now()}`,
                });
                if (response.data.status === "completed" &&
                    response.data.relationships) {
                    const tenantId = (0, withTenant_js_1.requireTenant)(context);
                    const extractedRelationships = response.data.relationships.map((rel) => ({
                        sourceEntityId: rel.source_entity_id,
                        targetEntityId: rel.target_entity_id,
                        type: rel.type,
                        confidence: rel.confidence,
                        textSpan: rel.text_span,
                    }));
                    // Create relationships in Neo4j
                    for (const rel of extractedRelationships) {
                        const createdAt = new Date().toISOString();
                        const props = {
                            id: (0, uuid_1.v4)(), // Generate a new ID for the relationship
                            confidence: rel.confidence,
                            textSpan: rel.textSpan,
                            createdAt: createdAt,
                            tenantId,
                        };
                        await neo4jSession.run(`
              MATCH (source:Entity {id: $sourceId, tenantId: $tenantId})
              MATCH (target:Entity {id: $targetId, tenantId: $tenantId})
              CREATE (source)-[r:${rel.type} $props]->(target)
              RETURN r
              `, {
                            sourceId: rel.sourceEntityId,
                            targetId: rel.targetEntityId,
                            tenantId,
                            props: props,
                        });
                        logger.info(`Created relationship: ${rel.sourceEntityId}-[${rel.type}]->${rel.targetEntityId}`);
                    }
                    return extractedRelationships;
                }
                else {
                    throw new Error(`ML service did not return completed relationships: ${response.data.status}`);
                }
            }
            catch (error) {
                logger.error({ error, text, entities }, "Error extracting relationships");
                throw new Error(`Failed to extract relationships: ${error.message}`);
            }
            finally {
                await neo4jSession.close(); // Close Neo4j session
            }
        },
    },
};
// Mock data for development when database is not available
function getMockEntities(type, q, limit = 25, offset = 0) {
    const mockEntities = [
        {
            id: "mock-entity-1",
            type: "PERSON",
            props: {
                name: "John Smith",
                email: "john.smith@example.com",
                phone: "+1-555-0101",
                location: "New York, NY",
            },
            createdAt: "2024-08-15T12:00:00Z",
            updatedAt: "2024-08-15T12:00:00Z",
        },
        {
            id: "mock-entity-2",
            type: "ORGANIZATION",
            props: {
                name: "Tech Corp Industries",
                industry: "Technology",
                headquarters: "San Francisco, CA",
                website: "https://techcorp.example.com",
            },
            createdAt: "2024-08-15T12:00:00Z",
            updatedAt: "2024-08-15T12:00:00Z",
        },
        {
            id: "mock-entity-3",
            type: "EVENT",
            props: {
                name: "Data Breach Incident",
                date: "2024-08-01",
                severity: "HIGH",
                status: "INVESTIGATING",
            },
            createdAt: "2024-08-15T12:00:00Z",
            updatedAt: "2024-08-15T12:00:00Z",
        },
        {
            id: "mock-entity-4",
            type: "LOCATION",
            props: {
                name: "Corporate Headquarters",
                address: "100 Market Street, San Francisco, CA 94105",
                coordinates: { lat: 37.7749, lng: -122.4194 },
            },
            createdAt: "2024-08-15T12:00:00Z",
            updatedAt: "2024-08-15T12:00:00Z",
        },
        {
            id: "mock-entity-5",
            type: "ASSET",
            props: {
                name: "Database Server DB-01",
                type: "SERVER",
                ip_address: "192.168.1.100",
                status: "ACTIVE",
            },
            createdAt: "2024-08-15T12:00:00Z",
            updatedAt: "2024-08-15T12:00:00Z",
        },
    ];
    let filtered = mockEntities;
    if (type) {
        filtered = filtered.filter((entity) => entity.type === type);
    }
    if (q) {
        filtered = filtered.filter((entity) => JSON.stringify(entity.props).toLowerCase().includes(q.toLowerCase()) ||
            entity.type.toLowerCase().includes(q.toLowerCase()));
    }
    return filtered.slice(offset, offset + limit);
}
function getMockEntity(id) {
    const entities = getMockEntities();
    return entities.find((entity) => entity.id === id) || null;
}
exports.default = entityResolvers;
//# sourceMappingURL=entity.js.map