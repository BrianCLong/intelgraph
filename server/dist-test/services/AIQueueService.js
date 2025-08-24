const { Queue } = require('bullmq');
const { getPostgresPool } = require('../config/database');
const config = require('../config');
const { v4: uuid } = require('uuid');
const connection = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
};
const aiQueue = new Queue('ai:requests', { connection });
async function enqueueAIRequest({ entityId, requester }, { traceId } = {}) {
    const pg = getPostgresPool();
    const client = await pg.connect();
    try {
        const id = uuid();
        const keyWindow = Math.floor(Date.now() / 1000 / 300); // 5m window
        const idemKey = `req:${entityId}:${requester}:${keyWindow}`;
        await client.query('BEGIN');
        await client.query(`CREATE TABLE IF NOT EXISTS copilot_ai_requests (
        id UUID PRIMARY KEY,
        entity_id TEXT NOT NULL,
        requester TEXT,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);
        // dedupe check: if a recent pending exists
        const existing = await client.query(`SELECT id FROM copilot_ai_requests WHERE entity_id=$1 AND requester=$2 AND created_at > now() - interval '5 minutes' ORDER BY created_at DESC LIMIT 1`, [entityId, requester]);
        if (existing.rows.length) {
            return existing.rows[0].id;
        }
        await client.query('INSERT INTO copilot_ai_requests(id, entity_id, requester, status) VALUES ($1,$2,$3,$4)', [id, entityId, requester, 'PENDING']);
        await client.query('COMMIT');
        await aiQueue.add('analyze', { requestId: id, entityId, requester, traceId, idemKey }, { jobId: idemKey, attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
        return id;
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
module.exports = { enqueueAIRequest, aiQueue };
//# sourceMappingURL=AIQueueService.js.map