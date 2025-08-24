const logger = require('../utils/logger');
const { getNeo4jDriver, getPostgresPool } = require('../config/database');
const EmbeddingService = require('../services/EmbeddingService');
function arrayToVectorLiteral(arr) {
    if (!Array.isArray(arr))
        return null;
    return '[' + arr.map((x) => (typeof x === 'number' ? x : Number(x) || 0)).join(',') + ']';
}
async function fetchExistingIds(pg, ids) {
    if (!ids.length)
        return new Set();
    const { rows } = await pg.query('SELECT entity_id FROM entity_embeddings WHERE entity_id = ANY($1::text[])', [ids]);
    return new Set(rows.map((r) => r.entity_id));
}
async function upsertEmbeddings(pg, pairs, model) {
    if (!pairs.length)
        return 0;
    const values = [];
    const placeholders = [];
    for (let i = 0; i < pairs.length; i++) {
        const { id, embedding } = pairs[i];
        values.push(id, arrayToVectorLiteral(embedding), model);
        const base = i * 3;
        placeholders.push(`($${base + 1}, $${base + 2}::vector, $${base + 3})`);
    }
    const sql = `INSERT INTO entity_embeddings (entity_id, embedding, model)
               VALUES ${placeholders.join(',')}
               ON CONFLICT (entity_id) DO UPDATE SET embedding = EXCLUDED.embedding, model = EXCLUDED.model, updated_at = NOW()`;
    await pg.query(sql, values);
    return pairs.length;
}
async function runOnce(batchSize = 50) {
    const driver = getNeo4jDriver();
    const pg = getPostgresPool();
    const embeddingService = new EmbeddingService();
    const session = driver.session();
    try {
        const invId = process.env.EMBEDDING_WORKER_INVESTIGATION_ID;
        const sinceIso = process.env.EMBEDDING_WORKER_SINCE_ISO;
        let query = `MATCH (e:Entity)`;
        const where = [];
        const params = { limit: Math.max(10, batchSize * 3) };
        if (invId) {
            query = `MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $invId})`;
            params.invId = invId;
        }
        if (sinceIso) {
            where.push(`e.createdAt >= datetime($sinceIso)`);
            params.sinceIso = sinceIso;
        }
        const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
        const result = await session.run(`${query}${whereClause}
       WITH e ORDER BY e.updatedAt DESC
       RETURN e.id as id, e.label as label, e.description as description, e.properties as properties
       LIMIT $limit`, params);
        const all = result.records.map((r) => ({
            id: r.get('id'),
            text: `${r.get('label') || ''} ${r.get('description') || ''} ${JSON.stringify(r.get('properties') || {})}`.trim(),
        }));
        // Filter to those missing in Postgres
        const existing = await fetchExistingIds(pg, all.map((x) => x.id));
        const todo = all.filter((x) => !existing.has(x.id)).slice(0, batchSize);
        if (todo.length === 0)
            return { processed: 0 };
        const embeddings = await embeddingService.generateEmbeddings(todo.map((t) => t.text));
        const pairs = todo.map((t, i) => ({ id: t.id, embedding: embeddings[i] }));
        const model = embeddingService.config.model;
        const written = await upsertEmbeddings(pg, pairs, model);
        return { processed: written };
    }
    catch (e) {
        logger.error('Embedding worker run failed', { err: e.message });
        return { processed: 0, error: e.message };
    }
    finally {
        await session.close();
    }
}
function startEmbeddingWorker(options = {}) {
    const enabled = process.env.EMBEDDING_WORKER_ENABLED !== '0';
    if (!enabled) {
        logger.info('Embedding worker disabled via EMBEDDING_WORKER_ENABLED=0');
        return { stop: () => { } };
    }
    const intervalMs = Number(process.env.EMBEDDING_WORKER_INTERVAL_MS || 10 * 60 * 1000); // 10 min
    const batchSize = Number(process.env.EMBEDDING_WORKER_BATCH || 50);
    let timer = null;
    const tick = async () => {
        const { processed, error } = await runOnce(batchSize);
        if (error)
            logger.warn('Embedding worker tick error', { error });
        if (processed)
            logger.info(`Embedding worker wrote ${processed} embeddings`);
    };
    // run soon after start, then on interval
    setTimeout(tick, 5000);
    timer = setInterval(tick, intervalMs);
    logger.info(`Embedding worker started: every ${intervalMs}ms, batch ${batchSize}`);
    return {
        stop: () => timer && clearInterval(timer),
        runOnce,
    };
}
module.exports = { startEmbeddingWorker };
//# sourceMappingURL=embeddingWorker.js.map