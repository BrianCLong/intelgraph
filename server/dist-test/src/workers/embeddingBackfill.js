"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillEmbeddings = backfillEmbeddings;
const database_js_1 = require("../config/database.js");
const database_js_2 = require("../config/database.js");
// Placeholder for embedding computation
async function computeEmbedding(text) {
    // In a real scenario, this would call an embedding model service
    return new Array(1536).fill(0); // Return a dummy embedding
}
async function backfillEmbeddings(tenantId) {
    const session = (0, database_js_2.getNeo4jDriver)().session();
    const pg = (0, database_js_1.getPostgresPool)();
    const res = await session.run('MATCH (e:Entity {tenantId:$t}) RETURN e.id AS id, e.type AS type, e.label AS label LIMIT 50000', { t: tenantId });
    for (const r of res.records) {
        const text = `${r.get('type')} ${r.get('label')}`;
        const emb = await computeEmbedding(text);
        await pg.query(`INSERT INTO entity_embeddings (tenant_id, entity_id, embedding, model)
       VALUES ($1,$2,$3::vector,$4)
       ON CONFLICT (tenant_id, entity_id)
       DO UPDATE SET embedding=$3::vector, model=$4, updated_at=NOW()`, [tenantId, r.get('id'), `[${emb.join(',')}]`, 'text-embedding-3-small']);
    }
    await session.close();
}
//# sourceMappingURL=embeddingBackfill.js.map