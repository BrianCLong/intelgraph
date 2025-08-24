"use strict";
/**
 * Core GraphQL Resolvers - Production persistence layer
 * Replaces demo resolvers with real PostgreSQL + Neo4j operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coreResolvers = void 0;
const graphql_1 = require("graphql");
const EntityRepo_js_1 = require("../../repos/EntityRepo.js");
const RelationshipRepo_js_1 = require("../../repos/RelationshipRepo.js");
const InvestigationRepo_js_1 = require("../../repos/InvestigationRepo.js");
const neo4j_js_1 = require("../../db/neo4j.js");
const postgres_js_1 = require("../../db/postgres.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const zod_1 = require("zod");
const resolverLogger = logger_js_1.default.child({ name: 'CoreResolvers' });
// Validation schemas
const EntityInputZ = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    kind: zod_1.z.string().min(1),
    labels: zod_1.z.array(zod_1.z.string()).default([]),
    props: zod_1.z.record(zod_1.z.any()).default({}),
    investigationId: zod_1.z.string().uuid().optional()
});
const EntityUpdateZ = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    labels: zod_1.z.array(zod_1.z.string()).optional(),
    props: zod_1.z.record(zod_1.z.any()).optional()
});
const RelationshipInputZ = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    srcId: zod_1.z.string().uuid(),
    dstId: zod_1.z.string().uuid(),
    type: zod_1.z.string().min(1),
    props: zod_1.z.record(zod_1.z.any()).default({}),
    investigationId: zod_1.z.string().uuid().optional()
});
// Initialize repositories
const pg = (0, postgres_js_1.getPostgresPool)();
const neo4j = (0, neo4j_js_1.getNeo4jDriver)();
const entityRepo = new EntityRepo_js_1.EntityRepo(pg, neo4j);
const relationshipRepo = new RelationshipRepo_js_1.RelationshipRepo(pg, neo4j);
const investigationRepo = new InvestigationRepo_js_1.InvestigationRepo(pg);
// Custom scalars
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize: (value) => value instanceof Date ? value.toISOString() : value,
    parseValue: (value) => new Date(value),
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            return new Date(ast.value);
        }
        return null;
    }
});
const JSONScalar = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            return JSON.parse(ast.value);
        }
        return null;
    }
});
exports.coreResolvers = {
    DateTime: DateTimeScalar,
    JSON: JSONScalar,
    Query: {
        // Entity queries
        entity: async (_, { id, tenantId }, context) => {
            const effectiveTenantId = tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            return await entityRepo.findById(id, effectiveTenantId);
        },
        entities: async (_, { input }, context) => {
            const effectiveTenantId = input.tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            return await entityRepo.search({
                tenantId: effectiveTenantId,
                kind: input.kind,
                props: input.props,
                limit: input.limit,
                offset: input.offset
            });
        },
        // Relationship queries
        relationship: async (_, { id, tenantId }, context) => {
            const effectiveTenantId = tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            return await relationshipRepo.findById(id, effectiveTenantId);
        },
        relationships: async (_, { input }, context) => {
            const effectiveTenantId = input.tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            return await relationshipRepo.search({
                tenantId: effectiveTenantId,
                type: input.type,
                srcId: input.srcId,
                dstId: input.dstId,
                limit: input.limit,
                offset: input.offset
            });
        },
        // Investigation queries
        investigation: async (_, { id, tenantId }, context) => {
            const effectiveTenantId = tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            return await investigationRepo.findById(id, effectiveTenantId);
        },
        investigations: async (_, { tenantId, status, limit, offset }, context) => {
            const effectiveTenantId = tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            return await investigationRepo.list({
                tenantId: effectiveTenantId,
                status,
                limit,
                offset
            });
        },
        // Graph traversal
        graphNeighborhood: async (_, { input }, context) => {
            const { startEntityId, tenantId, maxDepth = 2, relationshipTypes, entityKinds, limit = 100 } = input;
            const effectiveTenantId = tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            const session = neo4j.session();
            try {
                // Neo4j traversal query
                const cypher = `
          MATCH (center:Entity {id: $startEntityId, tenantId: $tenantId})
          CALL apoc.path.subgraphAll(center, {
            maxLevel: $maxDepth,
            relationshipFilter: $relationshipTypes,
            labelFilter: $entityKinds,
            limit: $limit
          }) YIELD nodes, relationships
          RETURN nodes, relationships
        `;
                const result = await session.run(cypher, {
                    startEntityId,
                    tenantId: effectiveTenantId,
                    maxDepth,
                    relationshipTypes: relationshipTypes?.join('|') || null,
                    entityKinds: entityKinds?.join(':') || null,
                    limit
                });
                if (result.records.length === 0) {
                    // Fallback to simple 1-hop query if APOC not available
                    const simpleResult = await session.run(`
            MATCH (center:Entity {id: $startEntityId, tenantId: $tenantId})
            OPTIONAL MATCH (center)-[r:REL]-(neighbor:Entity {tenantId: $tenantId})
            RETURN center, collect(DISTINCT neighbor) as neighbors, collect(DISTINCT r) as relationships
          `, { startEntityId, tenantId: effectiveTenantId });
                    const record = simpleResult.records[0];
                    const center = record?.get('center');
                    const neighbors = record?.get('neighbors') || [];
                    const relationships = record?.get('relationships') || [];
                    return {
                        center: await entityRepo.findById(startEntityId, effectiveTenantId),
                        entities: await Promise.all(neighbors
                            .filter((n) => n.properties.id !== startEntityId)
                            .map((n) => entityRepo.findById(n.properties.id, effectiveTenantId))),
                        relationships: await Promise.all(relationships.map((r) => relationshipRepo.findById(r.properties.id, effectiveTenantId))),
                        depth: 1
                    };
                }
                // Process APOC result
                const record = result.records[0];
                const nodes = record.get('nodes') || [];
                const relationships = record.get('relationships') || [];
                return {
                    center: await entityRepo.findById(startEntityId, effectiveTenantId),
                    entities: await Promise.all(nodes
                        .filter((n) => n.properties.id !== startEntityId)
                        .map((n) => entityRepo.findById(n.properties.id, effectiveTenantId))),
                    relationships: await Promise.all(relationships.map((r) => relationshipRepo.findById(r.properties.id, effectiveTenantId))),
                    depth: maxDepth
                };
            }
            finally {
                await session.close();
            }
        },
        // Full text search across entities
        searchEntities: async (_, { tenantId, query, kinds, limit }, context) => {
            const effectiveTenantId = tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            // Use PostgreSQL full-text search on props
            const params = [effectiveTenantId, `%${query}%`];
            let sql = `
        SELECT DISTINCT e.* FROM entities e 
        WHERE e.tenant_id = $1 
        AND (
          e.props::text ILIKE $2 
          OR array_to_string(e.labels, ' ') ILIKE $2
        )
      `;
            if (kinds && kinds.length > 0) {
                sql += ` AND e.kind = ANY($3)`;
                params.push(kinds);
            }
            sql += ` ORDER BY e.created_at DESC LIMIT $${params.length + 1}`;
            params.push(limit || 50);
            const { rows } = await pg.query(sql, params);
            return rows.map((row) => ({
                id: row.id,
                tenantId: row.tenant_id,
                kind: row.kind,
                labels: row.labels,
                props: row.props,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                createdBy: row.created_by
            }));
        }
    },
    Mutation: {
        // Entity mutations
        createEntity: async (_, { input }, context) => {
            const parsed = EntityInputZ.parse(input);
            const userId = context.user?.sub || context.user?.id || 'system';
            // Add investigation context to props if provided
            if (parsed.investigationId) {
                parsed.props = { ...parsed.props, investigationId: parsed.investigationId };
            }
            return await entityRepo.create(parsed, userId);
        },
        updateEntity: async (_, { input }, context) => {
            const parsed = EntityUpdateZ.parse(input);
            return await entityRepo.update(parsed);
        },
        deleteEntity: async (_, { id, tenantId }, context) => {
            const effectiveTenantId = tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            // Verify entity belongs to tenant before deletion
            const entity = await entityRepo.findById(id, effectiveTenantId);
            if (!entity) {
                return false;
            }
            return await entityRepo.delete(id);
        },
        // Relationship mutations
        createRelationship: async (_, { input }, context) => {
            const parsed = RelationshipInputZ.parse(input);
            const userId = context.user?.sub || context.user?.id || 'system';
            // Add investigation context to props if provided
            if (parsed.investigationId) {
                parsed.props = { ...parsed.props, investigationId: parsed.investigationId };
            }
            return await relationshipRepo.create(parsed, userId);
        },
        deleteRelationship: async (_, { id, tenantId }, context) => {
            const effectiveTenantId = tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            // Verify relationship belongs to tenant before deletion
            const relationship = await relationshipRepo.findById(id, effectiveTenantId);
            if (!relationship) {
                return false;
            }
            return await relationshipRepo.delete(id);
        },
        // Investigation mutations
        createInvestigation: async (_, { input }, context) => {
            const userId = context.user?.sub || context.user?.id || 'system';
            return await investigationRepo.create(input, userId);
        },
        updateInvestigation: async (_, { input }, context) => {
            return await investigationRepo.update(input);
        },
        deleteInvestigation: async (_, { id, tenantId }, context) => {
            const effectiveTenantId = tenantId || context.tenantId;
            if (!effectiveTenantId) {
                throw new Error('Tenant ID is required');
            }
            // Verify investigation belongs to tenant before deletion
            const investigation = await investigationRepo.findById(id, effectiveTenantId);
            if (!investigation) {
                return false;
            }
            return await investigationRepo.delete(id);
        }
    },
    // Field resolvers
    Entity: {
        relationships: async (parent, { direction = 'BOTH', type, limit = 100 }) => {
            const directionMap = {
                'INCOMING': 'incoming',
                'OUTGOING': 'outgoing',
                'BOTH': 'both'
            };
            return await relationshipRepo.findByEntityId(parent.id, parent.tenantId, directionMap[direction]);
        },
        relationshipCount: async (parent) => {
            const counts = await relationshipRepo.getEntityRelationshipCount(parent.id, parent.tenantId);
            return {
                incoming: counts.incoming,
                outgoing: counts.outgoing,
                total: counts.incoming + counts.outgoing
            };
        },
        investigation: async (parent) => {
            const investigationId = parent.props?.investigationId;
            if (!investigationId)
                return null;
            return await investigationRepo.findById(investigationId, parent.tenantId);
        }
    },
    Relationship: {
        source: async (parent) => {
            return await entityRepo.findById(parent.srcId, parent.tenantId);
        },
        destination: async (parent) => {
            return await entityRepo.findById(parent.dstId, parent.tenantId);
        }
    },
    Investigation: {
        stats: async (parent) => {
            return await investigationRepo.getStats(parent.id, parent.tenantId);
        },
        entities: async (parent, { kind, limit = 100, offset = 0 }) => {
            return await entityRepo.search({
                tenantId: parent.tenantId,
                kind,
                props: { investigationId: parent.id },
                limit,
                offset
            });
        },
        relationships: async (parent, { type, limit = 100, offset = 0 }) => {
            return await relationshipRepo.search({
                tenantId: parent.tenantId,
                type,
                limit,
                offset
            });
        }
    }
};
//# sourceMappingURL=core.js.map