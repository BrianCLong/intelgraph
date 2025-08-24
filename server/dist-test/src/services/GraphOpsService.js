"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { getNeo4jDriver } = require('../config/database');
const logger_js_1 = __importDefault(require("../utils/logger.js"));
async function expandNeighbors(entityId, limit = 50, { traceId } = {}) {
    const driver = getNeo4jDriver();
    const session = driver.session();
    const start = Date.now();
    try {
        const cypher = `
      MATCH (n:Entity {id: $entityId})-[r]-(m:Entity)
      WITH DISTINCT m, r LIMIT $limit
      RETURN
        collect(DISTINCT {id: m.id, label: coalesce(m.label, m.id), type: head(labels(m)), tags: coalesce(m.tags, [])}) AS nodes,
        collect(DISTINCT {id: toString(id(r)), source: startNode(r).id, target: endNode(r).id, type: type(r), label: r.label}) AS edges
    `;
        const res = await session.run(cypher, { entityId, limit: Number(limit) });
        const rec = res.records[0];
        const nodes = rec ? rec.get('nodes') : [];
        const edges = rec ? rec.get('edges') : [];
        const ms = Date.now() - start;
        logger_js_1.default.info('expandNeighbors', { entityId, limit, ms, traceId });
        return { nodes, edges };
    }
    finally {
        await session.close();
    }
}
async function expandNeighborhood(entityId, radius = 1, { tenantId, investigationId, traceId } = {}) {
    const driver = getNeo4jDriver();
    const session = driver.session();
    const start = Date.now();
    try {
        const cypher = `
      MATCH (n:Entity {id: $entityId, tenantId: $tenantId, investigationId: $investigationId})
      MATCH p = (n)-[r:RELATIONSHIP*1..$radius]-(m:Entity {tenantId: $tenantId, investigationId: $investigationId})
      WITH collect(DISTINCT m) AS mNodes, collect(DISTINCT r) AS rels
      RETURN
        [node IN mNodes | {id: node.id, label: coalesce(node.label, node.id), type: head(labels(node)), tags: coalesce(node.tags, [])}] AS nodes,
        [rel IN rels | {id: toString(id(rel)), source: startNode(rel).id, target: endNode(rel).id, type: type(rel), label: rel.label}] AS edges
    `;
        const res = await session.run(cypher, {
            entityId,
            radius: Number(radius),
            tenantId,
            investigationId,
        });
        const rec = res.records[0];
        const nodes = rec ? rec.get('nodes') : [];
        const edges = rec ? rec.get('edges') : [];
        const ms = Date.now() - start;
        logger_js_1.default.info('expandNeighborhood', { entityId, radius, investigationId, tenantId, ms, traceId });
        return { nodes, edges };
    }
    finally {
        await session.close();
    }
}
module.exports = { expandNeighbors, expandNeighborhood };
//# sourceMappingURL=GraphOpsService.js.map