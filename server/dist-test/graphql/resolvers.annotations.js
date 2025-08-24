// src/graphql/resolvers.annotations.js
const { v4: uuid } = require('uuid');
const { getNeo4jDriver, getPostgresPool } = require('../config/database');
const logger = require('../utils/logger');
const { evaluateOPA } = require('../services/AccessControl'); // Import OPA evaluation function
// Placeholder for ensureRole - replace with actual implementation if it exists elsewhere
function ensureRole(user, allowedRoles = []) {
    if (!user)
        throw new Error('Not authenticated');
    if (allowedRoles.length === 0)
        return true;
    const role = (user.role || '').toUpperCase();
    if (!allowedRoles.map(r => r.toUpperCase()).includes(role)) {
        const err = new Error('Forbidden');
        err.code = 'FORBIDDEN';
        throw err;
    }
}
const resolvers = {
    // Resolver for Entity.annotations field
    Entity: {
        annotations: async (parent, _, { user, logger }) => {
            const neo = getNeo4jDriver();
            const session = neo.session();
            try {
                const cypher = `
          MATCH (e:Entity {id: $entityId})-[:HAS_ANNOTATION]->(a:Annotation)
          RETURN a { .id, .content, .confidence, .createdAt, .updatedAt, .createdBy, .enclave } AS annotation
          ORDER BY a.createdAt DESC
        `;
                const result = await session.run(cypher, { entityId: parent.id });
                const annotations = result.records.map(record => record.get('annotation'));
                // Filter annotations based on OPA policy
                const filteredAnnotations = [];
                for (const annotation of annotations) {
                    const isAllowed = await evaluateOPA('read', user, { enclave: annotation.enclave }, {});
                    if (isAllowed) {
                        filteredAnnotations.push(annotation);
                    }
                }
                return filteredAnnotations;
            }
            catch (e) {
                logger.error(`Error fetching annotations for entity ${parent.id}: ${e.message}`);
                throw new Error('Failed to fetch annotations');
            }
            finally {
                await session.close();
            }
        },
    },
    // Resolver for Edge.annotations field
    Edge: {
        annotations: async (parent, _, { user, logger }) => {
            const neo = getNeo4jDriver();
            const session = neo.session();
            try {
                const cypher = `
          MATCH ()-[r]->() WHERE toString(id(r)) = $edgeId
          MATCH (r)-[:HAS_ANNOTATION]->(a:Annotation)
          RETURN a { .id, .content, .confidence, .createdAt, .updatedAt, .createdBy, .enclave } AS annotation
          ORDER BY a.createdAt DESC
        `;
                const result = await session.run(cypher, { edgeId: parent.id });
                const annotations = result.records.map(record => record.get('annotation'));
                // Filter annotations based on OPA policy
                const filteredAnnotations = [];
                for (const annotation of annotations) {
                    const isAllowed = await evaluateOPA('read', user, { enclave: annotation.enclave }, {});
                    if (isAllowed) {
                        filteredAnnotations.push(annotation);
                    }
                }
                return filteredAnnotations;
            }
            catch (e) {
                logger.error(`Error fetching annotations for edge ${parent.id}: ${e.message}`);
                throw new Error('Failed to fetch annotations');
            }
            finally {
                await session.close();
            }
        },
    },
    Mutation: {
        createEntityAnnotation: async (_, { entityId, input }, { user, logger }) => {
            ensureRole(user, ['ANALYST', 'ADMIN']); // Only analysts and admins can create annotations
            // OPA check for create permission
            const isAllowed = await evaluateOPA('create', user, { enclave: input.enclave }, {});
            if (!isAllowed) {
                throw new Error('Forbidden: Not allowed to create annotation with this enclave');
            }
            const neo = getNeo4jDriver();
            const pg = getPostgresPool();
            const session = neo.session();
            try {
                const annotationId = uuid();
                const now = new Date().toISOString();
                // Create Annotation node and link to Entity
                const cypher = `
          MATCH (e:Entity {id: $entityId})
          CREATE (a:Annotation {
            id: $annotationId,
            content: $content,
            confidence: $confidence,
            createdAt: $now,
            updatedAt: $now,
            createdBy: $createdBy,
            enclave: $enclave
          })
          CREATE (e)-[:HAS_ANNOTATION]->(a)
          RETURN a { .id, .content, .confidence, .createdAt, .updatedAt, .createdBy, .enclave } AS annotation
        `;
                const result = await session.run(cypher, {
                    entityId,
                    annotationId,
                    content: input.content,
                    confidence: input.confidence || 'UNKNOWN',
                    enclave: input.enclave,
                    now,
                    createdBy: user.id,
                });
                if (!result.records.length) {
                    throw new Error('Failed to create annotation or entity not found');
                }
                const annotation = result.records[0].get('annotation');
                // Audit trail
                await pg.query('INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)', [user.id, 'CREATE_ANNOTATION', 'Annotation', annotation.id, { entityId, content: input.content, enclave: input.enclave }]);
                return annotation;
            }
            catch (e) {
                logger.error(`Error creating entity annotation for ${entityId}: ${e.message}`);
                throw new Error('Failed to create entity annotation');
            }
            finally {
                await session.close();
            }
        },
        createEdgeAnnotation: async (_, { edgeId, input }, { user, logger }) => {
            ensureRole(user, ['ANALYST', 'ADMIN']);
            // OPA check for create permission
            const isAllowed = await evaluateOPA('create', user, { enclave: input.enclave }, {});
            if (!isAllowed) {
                throw new Error('Forbidden: Not allowed to create annotation with this enclave');
            }
            const neo = getNeo4jDriver();
            const pg = getPostgresPool();
            const session = neo.session();
            try {
                const annotationId = uuid();
                const now = new Date().toISOString();
                // Create Annotation node and link to Edge (Relationship in Neo4j)
                const cypher = `
          MATCH ()-[r]->() WHERE toString(id(r)) = $edgeId
          CREATE (a:Annotation {
            id: $annotationId,
            content: $content,
            confidence: $confidence,
            createdAt: $now,
            updatedAt: $now,
            createdBy: $createdBy,
            enclave: $enclave
          })
          CREATE (r)-[:HAS_ANNOTATION]->(a)
          RETURN a { .id, .content, .confidence, .createdAt, .updatedAt, .createdBy, .enclave } AS annotation
        `;
                const result = await session.run(cypher, {
                    edgeId, // Use edgeId
                    annotationId,
                    content: input.content,
                    confidence: input.confidence || 'UNKNOWN',
                    enclave: input.enclave,
                    now,
                    createdBy: user.id,
                });
                if (!result.records.length) {
                    throw new Error('Failed to create annotation or edge not found');
                }
                const annotation = result.records[0].get('annotation');
                // Audit trail
                await pg.query('INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)', [user.id, 'CREATE_ANNOTATION', 'Annotation', annotation.id, { edgeId, content: input.content, enclave: input.enclave }]);
                return annotation;
            }
            catch (e) {
                logger.error(`Error creating edge annotation for ${edgeId}: ${e.message}`);
                throw new Error('Failed to create edge annotation');
            }
            finally {
                await session.close();
            }
        },
        updateAnnotation: async (_, { id, input }, { user, logger }) => {
            ensureRole(user, ['ANALYST', 'ADMIN']);
            const neo = getNeo4jDriver();
            const pg = getPostgresPool();
            const session = neo.session();
            try {
                // First, fetch the existing annotation to get its current enclave
                const fetchCypher = `
          MATCH (a:Annotation {id: $id})
          RETURN a.enclave AS currentEnclave, a.createdBy AS createdBy
        `;
                const fetchResult = await session.run(fetchCypher, { id });
                if (!fetchResult.records.length) {
                    throw new Error('Annotation not found');
                }
                const currentEnclave = fetchResult.records[0].get('currentEnclave');
                const createdBy = fetchResult.records[0].get('createdBy');
                // Determine the target enclave for OPA check
                const targetEnclave = input.enclave !== undefined ? input.enclave : currentEnclave;
                // OPA check for update permission
                const isAllowed = await evaluateOPA('update', user, { enclave: targetEnclave, createdBy: createdBy }, {});
                if (!isAllowed) {
                    throw new Error('Forbidden: Not allowed to update this annotation or change its enclave');
                }
                const now = new Date().toISOString();
                const updateFields = [];
                const params = { id, now, updatedBy: user.id };
                if (input.content !== undefined) {
                    updateFields.push('a.content = $content');
                    params.content = input.content;
                }
                if (input.confidence !== undefined) {
                    updateFields.push('a.confidence = $confidence');
                    params.confidence = input.confidence;
                }
                if (input.enclave !== undefined) {
                    updateFields.push('a.enclave = $enclave');
                    params.enclave = input.enclave;
                }
                if (updateFields.length === 0) {
                    throw new Error('No fields to update');
                }
                const cypher = `
          MATCH (a:Annotation {id: $id})
          SET ${updateFields.join(', ')}, a.updatedAt = $now
          RETURN a { .id, .content, .confidence, .createdAt, .updatedAt, .createdBy, .enclave } AS annotation
        `;
                const result = await session.run(cypher, params);
                if (!result.records.length) {
                    throw new Error('Annotation not found');
                }
                const annotation = result.records[0].get('annotation');
                // Audit trail
                await pg.query('INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)', [user.id, 'UPDATE_ANNOTATION', 'Annotation', annotation.id, { updates: input }]);
                return annotation;
            }
            catch (e) {
                logger.error(`Error updating annotation ${id}: ${e.message}`);
                throw new Error('Failed to update annotation');
            }
            finally {
                await session.close();
            }
        },
        deleteAnnotation: async (_, { id }, { user, logger }) => {
            ensureRole(user, ['ANALYST', 'ADMIN']);
            const neo = getNeo4jDriver();
            const pg = getPostgresPool();
            const session = neo.session();
            try {
                // First, fetch the existing annotation to get its current enclave
                const fetchCypher = `
          MATCH (a:Annotation {id: $id})
          RETURN a.enclave AS currentEnclave, a.createdBy AS createdBy
        `;
                const fetchResult = await session.run(fetchCypher, { id });
                if (!fetchResult.records.length) {
                    throw new Error('Annotation not found');
                }
                const currentEnclave = fetchResult.records[0].get('currentEnclave');
                const createdBy = fetchResult.records[0].get('createdBy');
                // OPA check for delete permission
                const isAllowed = await evaluateOPA('delete', user, { enclave: currentEnclave, createdBy: createdBy }, {});
                if (!isAllowed) {
                    throw new Error('Forbidden: Not allowed to delete this annotation');
                }
                const cypher = `
          MATCH (a:Annotation {id: $id})
          DETACH DELETE a
          RETURN count(a) AS deletedCount
        `;
                const result = await session.run(cypher, { id });
                const deletedCount = result.records[0].get('deletedCount');
                if (deletedCount === 0) {
                    throw new Error('Annotation not found');
                }
                // Audit trail
                await pg.query('INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)', [user.id, 'DELETE_ANNOTATION', 'Annotation', id, {}]);
                return deletedCount > 0;
            }
            catch (e) {
                logger.error(`Error deleting annotation ${id}: ${e.message}`);
                throw new Error('Failed to delete annotation');
            }
            finally {
                await session.close();
            }
        },
    },
};
module.exports = resolvers;
//# sourceMappingURL=resolvers.annotations.js.map