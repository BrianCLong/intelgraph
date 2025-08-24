"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { getNeo4jDriver, getRedisClient, getPostgresPool } = require('../config/database');
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const { PubSub } = require('graphql-subscriptions');
const GNNService = require('../services/GNNService');
const pubsub = new PubSub();
const gnnService = new GNNService();
// Helper: fetch full Entity node by id (to satisfy non-null fields)
async function loadEntitiesByIds(ids) {
    if (!ids || ids.length === 0)
        return [];
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
        const res = await session.run(`MATCH (e:Entity)
       WHERE e.id IN $ids
       OPTIONAL MATCH (e)-[:BELONGS_TO]->(i:Investigation)
       RETURN e, i`, { ids });
        return res.records.map((r) => {
            const e = r.get('e').properties;
            // Normalize minimal required fields when absent
            return {
                id: e.id,
                type: e.type,
                label: e.label,
                description: e.description || '',
                properties: e.properties || {},
                confidence: e.confidence != null ? e.confidence : 1.0,
                source: e.source || 'unknown',
                investigationId: e.investigationId || (r.get('i')?.properties?.id ?? ''),
                createdBy: e.createdBy || 'system',
                updatedBy: e.updatedBy || null,
                createdAt: e.createdAt || new Date(0).toISOString(),
                updatedAt: e.updatedAt || new Date(0).toISOString(),
            };
        });
    }
    finally {
        await session.close();
    }
}
const aiResolvers = {
    Query: {
        // Suggest likely missing edges for a given entity via simple common-neighbor heuristic
        async suggestLinks(_, { entityId, limit = 5 }, { user }) {
            if (!user)
                throw new Error('Not authenticated');
            const driver = getNeo4jDriver();
            const redis = getRedisClient();
            const session = driver.session();
            try {
                // Cache-first
                const cacheKey = `ai:suggest:${entityId}:${limit}`;
                try {
                    const cached = await redis.get(cacheKey);
                    if (cached)
                        return JSON.parse(cached);
                }
                catch (_) { }
                // 1) Collect neighbors of the seed entity
                const nbRes = await session.run(`MATCH (e:Entity {id: $entityId})-[]-(n:Entity)
           RETURN collect(distinct n.id) AS nbs`, { entityId });
                if (nbRes.records.length === 0)
                    return [];
                const nbs = nbRes.records[0].get('nbs');
                if (!nbs || nbs.length === 0)
                    return [];
                // 2) Find candidate nodes that share neighbors with the seed but are not already connected
                const candRes = await session.run(`MATCH (seed:Entity {id: $entityId})
           MATCH (cand:Entity)-[]-(n:Entity)
           WHERE cand.id <> $entityId
             AND n.id IN $nbs
             AND NOT (seed)-[]-(cand)
           WITH cand, count(distinct n) AS commonNeighbors
           ORDER BY commonNeighbors DESC
           LIMIT $limit
           RETURN cand.id AS toId, commonNeighbors`, { entityId, nbs, limit: Math.max(1, Math.min(100, limit)) });
                const recs = candRes.records.map((r) => ({
                    from: entityId,
                    to: r.get('toId'),
                    score: Number(r.get('commonNeighbors')),
                    reason: 'High number of common neighbors',
                }));
                // Cache the heuristic result briefly
                try {
                    await redis.set(cacheKey, JSON.stringify(recs), 'EX', 60);
                }
                catch (_) { }
                // Publish immediately for subscribers
                try {
                    await pubsub.publish(`AI_SUGG_${entityId}`, { aiSuggestions: recs });
                }
                catch (_) { }
                // Kick off GNN link prediction in background (best-effort)
                try {
                    const candidateEdges = recs.map(r => [r.from, r.to]);
                    gnnService.predictLinks({
                        investigationId: null,
                        graphData: null, // service can pull graph via its own source if configured; kept null to enqueue
                        nodeFeatures: {},
                        candidateEdges,
                        modelName: 'default_link_predictor',
                        taskMode: 'predict',
                        options: { focusEntityId: entityId }
                    }).catch(() => { });
                }
                catch (_) { }
                return recs;
            }
            catch (e) {
                logger_js_1.default.error('suggestLinks failed', { entityId, err: e.message });
                return [];
            }
            finally {
                await session.close();
            }
        },
        // Simple anomaly detection: high-degree outliers per investigation
        async detectAnomalies(_, { investigationId, limit = 10 }, { user }) {
            if (!user)
                throw new Error('Not authenticated');
            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                // Compute degree for nodes (within investigation if provided)
                const whereInv = investigationId
                    ? 'MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})'
                    : 'MATCH (e:Entity)';
                const res = await session.run(`${whereInv}
           OPTIONAL MATCH (e)-[r]-()
           WITH e, count(r) AS deg
           WITH collect(deg) AS allDegs, collect(e.id) AS ids
           WITH allDegs, ids,
                reduce(s=0, x IN allDegs | s + x) * 1.0 / toFloat(size(allDegs)) AS mean,
                sqrt(reduce(s=0, x IN allDegs | s + (x^2)) * 1.0 / toFloat(size(allDegs)) -
                     pow(reduce(s=0, x IN allDegs | s + x) * 1.0 / toFloat(size(allDegs)), 2)) AS sd
           WITH mean, sd, ids
           UNWIND ids AS eid
           MATCH (e:Entity {id: eid})
           OPTIONAL MATCH (e)-[r]-()
           WITH e, count(r) AS deg, mean, sd
           WITH e, deg,
                CASE WHEN sd = 0 OR sd IS NULL THEN 0 ELSE (deg - mean) / sd END AS z
           ORDER BY z DESC
           LIMIT $limit
           RETURN e.id AS entityId,
                  CASE WHEN z IS NULL THEN 0.0 ELSE toFloat(z) END AS anomalyScore,
                  deg AS degree`, { investigationId, limit: Math.max(1, Math.min(100, limit)) });
                return res.records.map((r) => ({
                    entityId: r.get('entityId'),
                    anomalyScore: Number(r.get('anomalyScore')),
                    reason: `High degree: ${r.get('degree').toNumber ? r.get('degree').toNumber() : r.get('degree')}`,
                }));
            }
            catch (e) {
                logger_js_1.default.error('detectAnomalies failed', { investigationId, err: e.message });
                return [];
            }
            finally {
                await session.close();
            }
        },
        // Full-text search with optional filters; resolves to full Entity objects
        async searchEntities(_, { q, filters = {}, limit = 25 }, { user }) {
            if (!user)
                throw new Error('Not authenticated');
            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                const clauses = [];
                const params = { q, limit: Math.max(1, Math.min(100, limit)) };
                if (filters.type) {
                    clauses.push('node.type = $type');
                    params.type = filters.type;
                }
                if (filters.investigationId) {
                    clauses.push('exists( (node)-[:BELONGS_TO]->(:Investigation {id: $investigationId}) )');
                    params.investigationId = filters.investigationId;
                }
                const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
                const query = `
          CALL db.index.fulltext.queryNodes('entity_search', $q) YIELD node, score
          ${where}
          RETURN node.id AS id
          ORDER BY score DESC
          LIMIT $limit`;
                const res = await session.run(query, params);
                const ids = res.records.map((r) => r.get('id'));
                const entities = await loadEntitiesByIds(ids);
                // Preserve order by score
                const order = new Map(ids.map((id, idx) => [id, idx]));
                entities.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
                return entities;
            }
            catch (e) {
                logger_js_1.default.error('searchEntities failed', { q, err: e.message });
                return [];
            }
            finally {
                await session.close();
            }
        },
        // Hybrid search using Neo4j full-text + Postgres pgvector similarity (if available)
        async searchEntitiesHybrid(_, { q, filters = {}, limit = 25 }, { user }) {
            if (!user)
                throw new Error('Not authenticated');
            const driver = getNeo4jDriver();
            const pg = getPostgresPool();
            const session = driver.session();
            try {
                // 1) Full-text in Neo4j with scores
                const clauses = [];
                const params = { q, limit: Math.max(1, Math.min(100, limit)) };
                if (filters.type) {
                    clauses.push('node.type = $type');
                    params.type = filters.type;
                }
                if (filters.investigationId) {
                    clauses.push('exists( (node)-[:BELONGS_TO]->(:Investigation {id: $investigationId}) )');
                    params.investigationId = filters.investigationId;
                }
                const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
                const ftRes = await session.run(`CALL db.index.fulltext.queryNodes('entity_search', $q) YIELD node, score
           ${where}
           RETURN node.id AS id, score
           ORDER BY score DESC
           LIMIT $limit`, params);
                const fulltextScores = new Map(ftRes.records.map(r => [r.get('id'), Number(r.get('score'))]));
                // 2) Vector similarity from Postgres (if installed)
                let vectorScores = new Map();
                try {
                    // Expect a table: entity_embeddings(entity_id text primary key, embedding vector)
                    // And an embedding for the query text computed externally or via SQL function; for simplicity, treat q as pre-embedded using a helper function (if present).
                    // If no function, this will throw and we fall back to full-text only.
                    const sql = `
            WITH query AS (
              SELECT embed_text($1) AS qv -- requires an extension function
            )
            SELECT e.entity_id, (1 - (e.embedding <#> (SELECT qv FROM query))) AS sim
            FROM entity_embeddings e
            ORDER BY e.embedding <#> (SELECT qv FROM query)
            LIMIT $2`;
                    const { rows } = await pg.query(sql, [q, limit]);
                    vectorScores = new Map(rows.map(r => [r.entity_id, Number(r.sim)]));
                }
                catch (err) {
                    logger_js_1.default.warn('pgvector hybrid search unavailable, falling back to full-text', { err: err.message });
                }
                // 3) Merge scores (normalize roughly) and order
                const ids = new Set([...fulltextScores.keys(), ...vectorScores.keys()]);
                // Normalize scores to [0,1] naively by dividing by max
                const ftMax = Math.max(1e-6, ...fulltextScores.values());
                const vsMax = Math.max(1e-6, ...vectorScores.values());
                const combined = Array.from(ids).map(id => {
                    const ft = (fulltextScores.get(id) || 0) / ftMax;
                    const vs = (vectorScores.get(id) || 0) / vsMax;
                    const score = 0.6 * ft + 0.4 * vs;
                    return { id, score };
                });
                combined.sort((a, b) => b.score - a.score);
                const topIds = combined.slice(0, limit).map(x => x.id);
                const entities = await loadEntitiesByIds(topIds);
                const order = new Map(topIds.map((id, idx) => [id, idx]));
                entities.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
                return entities;
            }
            catch (e) {
                logger_js_1.default.error('searchEntitiesHybrid failed', { q, err: e.message });
                return [];
            }
            finally {
                await session.close();
            }
        },
    },
    Mutation: {
        async recordAnomaly(_, { entityId, anomalyScore, reason }, { user }) {
            if (!user)
                throw new Error('Not authenticated');
            const driver = getNeo4jDriver();
            const session = driver.session();
            try {
                await session.run(`MATCH (e:Entity {id: $entityId})
           CREATE (a:Annotation {
             id: randomUUID(),
             content: $reason,
             confidence: 'UNKNOWN',
             createdAt: datetime().toString(),
             updatedAt: datetime().toString(),
             createdBy: $createdBy,
             enclave: 'UNCLASSIFIED'
           })-[:ANNOTATES]->(e)`, { entityId, reason: reason || 'Anomaly detected', createdBy: user.id });
            }
            catch (e) {
                logger_js_1.default.error('recordAnomaly failed', { entityId, err: e.message });
            }
            finally {
                await session.close();
            }
            return { entityId, anomalyScore, reason: reason || 'Anomaly detected' };
        },
    },
    Subscription: {
        aiSuggestions: {
            subscribe: (_, { entityId }) => pubsub.asyncIterator([`AI_SUGG_${entityId}`]),
            resolve: (event) => event.payload
        },
    },
};
module.exports = { aiResolvers };
// Export helper to publish suggestions from external workers/webhooks
module.exports.publishAISuggestions = async function publishAISuggestions(entityId, recs) {
    try {
        await pubsub.publish(`AI_SUGG_${entityId}`, { aiSuggestions: recs || [] });
    }
    catch (_) { }
};
//# sourceMappingURL=resolvers.ai.js.map