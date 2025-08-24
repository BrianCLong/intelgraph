const { getPostgresPool, getNeo4jDriver } = require('../config/database');
const { getIO } = require('../realtime/socket');
const logger = require('../utils/logger');
const { realtimeConflictsTotal } = require('../monitoring/metrics'); // Import the metric
// Default strategy: store in Neo4j for locality, mirror to PG for audit/search if table exists
async function addTag(entityId, tag, clientLastModifiedAt, { user, traceId } = {}) {
    const neo = getNeo4jDriver();
    const pg = getPostgresPool();
    const session = neo.session();
    const tenantId = user?.tenantId;
    if (!tenantId) {
        throw new Error('Tenant context required');
    }
    try {
        // Fetch current entity and its lastModifiedAt first for conflict detection
        const fetchCypher = `
      MATCH (e:Entity {id: $entityId, tenantId: $tenantId})
      RETURN e.lastModifiedAt AS lastModifiedAt, e.tags AS tags
    `;
        const fetchRes = await session.run(fetchCypher, { entityId, tenantId });
        if (!fetchRes.records.length) {
            const err = new Error('Entity not found');
            err.code = 'NOT_FOUND';
            throw err;
        }
        const currentLastModifiedAt = fetchRes.records[0].get('lastModifiedAt');
        const currentTags = fetchRes.records[0].get('tags') || [];
        // LWW check
        if (currentLastModifiedAt && clientLastModifiedAt && new Date(clientLastModifiedAt).getTime() < new Date(currentLastModifiedAt).getTime()) {
            realtimeConflictsTotal.inc();
            const err = new Error('Conflict: Entity has been modified more recently. Please refresh and try again.');
            err.code = 'LWW_CONFLICT';
            throw err;
        }
        // If no conflict, proceed with tag update
        const cypher = `
      MATCH (e:Entity {id: $entityId, tenantId: $tenantId})
      WITH e, CASE WHEN e.tags IS NULL THEN [] ELSE e.tags END AS tags
      WITH e, CASE WHEN $tag IN tags THEN tags ELSE tags + $tag END AS newTags
      SET e.tags = newTags, e.lastModifiedAt = datetime()
      RETURN e { .id, .label, type: head(labels(e)), tags: e.tags } AS entity
    `;
        const res = await session.run(cypher, { entityId, tag, tenantId });
        if (!res.records.length) {
            const err = new Error('Entity not found during update');
            err.code = 'NOT_FOUND';
            throw err;
        }
        const entity = res.records[0].get('entity');
        const newLastModifiedAt = new Date().toISOString();
        // Mirror to PG if table exists
        try {
            await pg.query(`CREATE TABLE IF NOT EXISTS entity_tags (
          entity_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE (entity_id, tag, tenant_id)
        )`);
            await pg.query('INSERT INTO entity_tags(entity_id, tag, tenant_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [entityId, tag, tenantId]);
            await pg.query('INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [user?.id || null, 'TAG_ENTITY', 'Entity', entityId, { tag, traceId, tenantId, newLastModifiedAt }]);
        }
        catch (e) {
            logger.warn('TagService PG mirror failed', { err: e.message });
        }
        // Emit optional graph update
        try {
            const io = getIO();
            if (io)
                io.of('/realtime').emit('graph:updated', { entityId, change: { type: 'tag_added', tag, lastModifiedAt: newLastModifiedAt } });
        }
        catch (_) { /* Intentionally empty */ }
        return entity;
    }
    finally {
        await session.close();
    }
}
async function deleteTag(entityId, tag, { user, traceId } = {}) {
    const neo = getNeo4jDriver();
    const pg = getPostgresPool();
    const session = neo.session();
    const tenantId = user?.tenantId;
    if (!tenantId) {
        throw new Error('Tenant context required');
    }
    try {
        const cypher = `
      MATCH (e:Entity {id: $entityId, tenantId: $tenantId})
      WITH e, CASE WHEN e.tags IS NULL THEN [] ELSE e.tags END AS tags
      SET e.tags = [t IN tags WHERE t <> $tag]
      RETURN e { .id, .label, type: head(labels(e)), tags: e.tags } AS entity
    `;
        const res = await session.run(cypher, { entityId, tag, tenantId });
        if (!res.records.length) {
            const err = new Error('Entity not found');
            err.code = 'NOT_FOUND';
            throw err;
        }
        const entity = res.records[0].get('entity');
        try {
            await pg.query('DELETE FROM entity_tags WHERE entity_id = $1 AND tag = $2 AND tenant_id = $3', [entityId, tag, tenantId]);
            await pg.query('INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)', [user?.id || null, 'DELETE_TAG', 'Entity', entityId, { tag, traceId, tenantId }]);
        }
        catch (e) {
            logger.warn('TagService PG mirror failed on delete', { err: e.message });
        }
        try {
            const io = getIO();
            if (io)
                io.of('/realtime').emit('graph:updated', { entityId, change: { type: 'tag_removed', tag } });
        }
        catch (_) { /* Intentionally empty */ }
        return entity;
    }
    finally {
        await session.close();
    }
}
module.exports = { addTag, deleteTag };
//# sourceMappingURL=TagService.js.map