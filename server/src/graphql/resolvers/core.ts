/**
 * Core GraphQL Resolvers - Production persistence layer
 * Replaces demo resolvers with real PostgreSQL + Neo4j operations
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { EntityRepo } from '../../repos/EntityRepo.js';
import { RelationshipRepo } from '../../repos/RelationshipRepo.js';
import { InvestigationRepo } from '../../repos/InvestigationRepo.js';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { getPostgresPool } from '../../db/postgres.js';
import logger from '../../config/logger.js';
import { z } from 'zod';

const resolverLogger = logger.child({ name: 'CoreResolvers' });

// Validation schemas
const EntityInputZ = z.object({
  tenantId: z.string().min(1),
  kind: z.string().min(1),
  labels: z.array(z.string()).default([]),
  props: z.record(z.any()).default({}),
  investigationId: z.string().uuid().optional()
});

const EntityUpdateZ = z.object({
  id: z.string().uuid(),
  labels: z.array(z.string()).optional(),
  props: z.record(z.any()).optional()
});

const RelationshipInputZ = z.object({
  tenantId: z.string().min(1),
  srcId: z.string().uuid(),
  dstId: z.string().uuid(),
  type: z.string().min(1),
  props: z.record(z.any()).default({}),
  investigationId: z.string().uuid().optional()
});

// Initialize repositories
const pg = getPostgresPool();
const neo4j = getNeo4jDriver();
const entityRepo = new EntityRepo(pg, neo4j);
const relationshipRepo = new RelationshipRepo(pg, neo4j);
const investigationRepo = new InvestigationRepo(pg);

// Custom scalars
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize: (value: any) => value instanceof Date ? value.toISOString() : value,
  parseValue: (value: any) => new Date(value),
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    return null;
  }
});

export const coreResolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  Query: {
    // Entity queries
    entity: async (_: any, { id, tenantId }: any, context: any) => {
      const effectiveTenantId = tenantId || context.tenantId;
      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }
      return await entityRepo.findById(id, effectiveTenantId);
    },

    entities: async (_: any, { input }: any, context: any) => {
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
    relationship: async (_: any, { id, tenantId }: any, context: any) => {
      const effectiveTenantId = tenantId || context.tenantId;
      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }
      return await relationshipRepo.findById(id, effectiveTenantId);
    },

    relationships: async (_: any, { input }: any, context: any) => {
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
    investigation: async (_: any, { id, tenantId }: any, context: any) => {
      const effectiveTenantId = tenantId || context.tenantId;
      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }
      return await investigationRepo.findById(id, effectiveTenantId);
    },

    investigations: async (_: any, { tenantId, status, limit, offset }: any, context: any) => {
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
    graphNeighborhood: async (_: any, { input }: any, context: any) => {
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
            entities: await Promise.all(
              neighbors
                .filter((n: any) => n.properties.id !== startEntityId)
                .map((n: any) => entityRepo.findById(n.properties.id, effectiveTenantId))
            ),
            relationships: await Promise.all(
              relationships.map((r: any) => relationshipRepo.findById(r.properties.id, effectiveTenantId))
            ),
            depth: 1
          };
        }

        // Process APOC result
        const record = result.records[0];
        const nodes = record.get('nodes') || [];
        const relationships = record.get('relationships') || [];

        return {
          center: await entityRepo.findById(startEntityId, effectiveTenantId),
          entities: await Promise.all(
            nodes
              .filter((n: any) => n.properties.id !== startEntityId)
              .map((n: any) => entityRepo.findById(n.properties.id, effectiveTenantId))
          ),
          relationships: await Promise.all(
            relationships.map((r: any) => relationshipRepo.findById(r.properties.id, effectiveTenantId))
          ),
          depth: maxDepth
        };

      } finally {
        await session.close();
      }
    },

    // Full text search across entities
    searchEntities: async (_: any, { tenantId, query, kinds, limit }: any, context: any) => {
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
      return rows.map((row: any) => ({
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
    createEntity: async (_: any, { input }: any, context: any) => {
      const parsed = EntityInputZ.parse(input);
      const userId = context.user?.sub || context.user?.id || 'system';
      
      // Add investigation context to props if provided
      if (parsed.investigationId) {
        parsed.props = { ...parsed.props, investigationId: parsed.investigationId };
      }

      return await entityRepo.create(parsed, userId);
    },

    updateEntity: async (_: any, { input }: any, context: any) => {
      const parsed = EntityUpdateZ.parse(input);
      return await entityRepo.update(parsed);
    },

    deleteEntity: async (_: any, { id, tenantId }: any, context: any) => {
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
    createRelationship: async (_: any, { input }: any, context: any) => {
      const parsed = RelationshipInputZ.parse(input);
      const userId = context.user?.sub || context.user?.id || 'system';
      
      // Add investigation context to props if provided
      if (parsed.investigationId) {
        parsed.props = { ...parsed.props, investigationId: parsed.investigationId };
      }

      return await relationshipRepo.create(parsed, userId);
    },

    deleteRelationship: async (_: any, { id, tenantId }: any, context: any) => {
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
    createInvestigation: async (_: any, { input }: any, context: any) => {
      const userId = context.user?.sub || context.user?.id || 'system';
      return await investigationRepo.create(input, userId);
    },

    updateInvestigation: async (_: any, { input }: any, context: any) => {
      return await investigationRepo.update(input);
    },

    deleteInvestigation: async (_: any, { id, tenantId }: any, context: any) => {
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
    relationships: async (parent: any, { direction = 'BOTH', type, limit = 100 }: any) => {
      const directionMap = {
        'INCOMING': 'incoming',
        'OUTGOING': 'outgoing',
        'BOTH': 'both'
      };
      
      return await relationshipRepo.findByEntityId(
        parent.id,
        parent.tenantId,
        directionMap[direction] as any
      );
    },

    relationshipCount: async (parent: any) => {
      const counts = await relationshipRepo.getEntityRelationshipCount(parent.id, parent.tenantId);
      return {
        incoming: counts.incoming,
        outgoing: counts.outgoing,
        total: counts.incoming + counts.outgoing
      };
    },

    investigation: async (parent: any) => {
      const investigationId = parent.props?.investigationId;
      if (!investigationId) return null;
      
      return await investigationRepo.findById(investigationId, parent.tenantId);
    }
  },

  Relationship: {
    source: async (parent: any) => {
      return await entityRepo.findById(parent.srcId, parent.tenantId);
    },

    destination: async (parent: any) => {
      return await entityRepo.findById(parent.dstId, parent.tenantId);
    }
  },

  Investigation: {
    stats: async (parent: any) => {
      return await investigationRepo.getStats(parent.id, parent.tenantId);
    },

    entities: async (parent: any, { kind, limit = 100, offset = 0 }: any) => {
      return await entityRepo.search({
        tenantId: parent.tenantId,
        kind,
        props: { investigationId: parent.id },
        limit,
        offset
      });
    },

    relationships: async (parent: any, { type, limit = 100, offset = 0 }: any) => {
      return await relationshipRepo.search({
        tenantId: parent.tenantId,
        type,
        limit,
        offset
      });
    }
  }
};