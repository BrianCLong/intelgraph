const express = require('express');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const crypto = require('crypto');
const stream = require('stream');
const puppeteer = require('puppeteer');
const { getNeo4jDriver } = require('../config/database');
const { ensureAuthenticated } = require('../middleware/auth');
const { redactData } = require('../utils/dataRedaction');
const router = express.Router();
router.use(ensureAuthenticated);
function addFilterClauses({ investigationId, entityType, tags, startDate, endDate, }) {
    const conditions = [];
    const params = {};
    if (investigationId) {
        conditions.push('e.investigation_id = $investigationId');
        params.investigationId = investigationId;
    }
    if (entityType) {
        conditions.push('e.type = $entityType');
        params.entityType = entityType;
    }
    if (tags && tags.length > 0) {
        conditions.push('ANY(tag IN e.tags WHERE tag IN $tags)');
        params.tags = tags;
    }
    if (startDate) {
        conditions.push('e.created_at >= $startDate');
        params.startDate = startDate;
    }
    if (endDate) {
        conditions.push('e.created_at <= $endDate');
        params.endDate = endDate;
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params };
}
router.get('/entities', async (req, res) => {
    const session = getNeo4jDriver().session();
    try {
        const { format = 'json', investigationId, entityType, tags, startDate, endDate } = req.query;
        const { where, params } = addFilterClauses({
            investigationId,
            entityType,
            tags: tags ? tags.split(',') : undefined,
            startDate,
            endDate,
        });
        if (format === "json") {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="entities.json"');
            const writableStream = res;
            writableStream.write('{"nodes":[');
            const nodesQuery = `MATCH (e:Entity) ${where} RETURN e`;
            const nodesResult = await session.run(nodesQuery, params);
            for (let i = 0; i < nodesResult.records.length; i++) {
                const originalNode = nodesResult.records[i].get('e').properties;
                const redactedNode = redactData(originalNode, req.user);
                writableStream.write(JSON.stringify(redactedNode));
                if (i < nodesResult.records.length - 1) {
                    writableStream.write(",");
                }
            }
            writableStream.write('],"edges":[');
            const edgeWhere = where.replace(/e\./g, "a.");
            const edgesQuery = `MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + " AND b.investigation_id = a.investigation_id" : ""} RETURN a,r,b`;
            const edgesResult = await session.run(edgesQuery, params);
            for (let i = 0; i < edgesResult.records.length; i++) {
                const r = edgesResult.records[i].get('r');
                const a = edgesResult.records[i].get('a');
                const b = edgesResult.records[i].get('b');
                const originalEdge = {
                    id: r.properties?.id || r.identity?.toString?.() || undefined,
                    uuid: r.properties?.uuid,
                    type: r.type || r.properties?.type,
                    label: r.properties?.label,
                    source: a.properties?.uuid,
                    target: b.properties?.uuid,
                    properties: r.properties || {},
                };
                const redactedEdge = redactData(originalEdge, req.user);
                writableStream.write(JSON.stringify(redactedEdge));
                if (i < edgesResult.records.length - 1) {
                    writableStream.write(",");
                }
            }
            writableStream.write(']}');
            writableStream.end();
        }
        else if (format === "csv") {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="entities.csv"');
            const writableStream = res;
            const nodeParser = new Parser({
                fields: ["uuid", "name", "type", "properties"],
                header: true,
            });
            const edgeParser = new Parser({
                fields: ["uuid", "type", "label", "source", "target", "properties"],
                header: true,
            });
            writableStream.write("# Nodes\n");
            const nodesQuery = `MATCH (e:Entity) ${where} RETURN e`;
            const nodesResult = await session.run(nodesQuery, params);
            const nodes = nodesResult.records.map(rec => redactData(rec.get('e').properties, req.user));
            writableStream.write(nodeParser.parse(nodes.map(n => ({ ...n, properties: JSON.stringify(n.properties || {}) }))) + '\n\n');
            writableStream.write('# Edges\n');
            const edgeWhere = where.replace(/e\./g, 'a.');
            const edgesQuery = `MATCH (a:Entity)-[r:RELATIONSHIP]->(b:Entity) ${edgeWhere ? edgeWhere + ' AND b.investigation_id = a.investigation_id' : ''} RETURN a,r,b`;
            const edgesResult = await session.run(edgesQuery, params);
            const edges = edgesResult.records.map(rec => {
                const r = rec.get('r');
                const a = rec.get('a');
                const b = rec.get('b');
                const originalEdge = {
                    id: r.properties?.id || r.identity?.toString?.() || undefined,
                    uuid: r.properties?.uuid,
                    type: r.type || r.properties?.type,
                    label: r.properties?.label,
                    source: a.properties?.uuid,
                    target: b.properties?.uuid,
                    properties: r.properties || {},
                };
                return redactData(originalEdge, req.user);
            });
            writableStream.write(edgeParser.parse(edges.map(e => ({ ...e, properties: JSON.stringify(e.properties || {}) }))) + '\n');
            writableStream.end();
        }
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
    finally {
        await session.close();
    }
});
module.exports = router;
//# sourceMappingURL=export.js.map