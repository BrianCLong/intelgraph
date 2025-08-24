const { Worker } = require('bullmq');
const fetch = require('node-fetch');
const { getPostgresPool } = require('../config/database');
const config = require('../config');
const logger = require('../utils/logger');
const { getIO } = require('../realtime/socket');
const connection = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
};
function startAIWorker() {
    const worker = new Worker('ai:requests', async (job) => {
        const { requestId, entityId } = job.data;
        const pg = getPostgresPool();
        try {
            await pg.query('UPDATE copilot_ai_requests SET status=$1 WHERE id=$2', ['RUNNING', requestId]);
            // Call Python microservice (stub or configured via env)
            const url = process.env.AI_SERVICE_URL || 'http://localhost:5001/analyze';
            let result;
            try {
                const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityId }) });
                if (!res.ok)
                    throw new Error(`AI service status ${res.status}`);
                result = await res.json();
            }
            catch (e) {
                // Fallback stub
                result = { summary: `Insights for ${entityId}`, suggestions: ['Review transactions', 'Check affiliations'], related: [] };
            }
            await pg.query('UPDATE copilot_ai_requests SET status=$1 WHERE id=$2', ['SUCCEEDED', requestId]);
            // Emit realtime event
            const io = getIO();
            if (io) {
                io.of('/realtime').to(`ai:entity:${entityId}`).emit('ai:insight', { entityId, data: result, requestId });
            }
            return result;
        }
        catch (e) {
            await getPostgresPool().query('UPDATE copilot_ai_requests SET status=$1 WHERE id=$2', ['FAILED', requestId]);
            logger.error('AI worker error', { err: e });
            throw e;
        }
    }, { connection });
    return worker;
}
module.exports = { startAIWorker };
//# sourceMappingURL=aiWorker.js.map