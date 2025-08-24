const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const ExternalAPIService = require('../services/ExternalAPIService');
const { getPostgresPool } = require('../config/database');
const router = express.Router();
const svc = new ExternalAPIService(console);
router.use(ensureAuthenticated);
router.get('/providers', (req, res) => {
    const p = svc.providers();
    res.json({ providers: Object.keys(p).map(k => ({ id: k, info: p[k].info })) });
});
router.post('/query', async (req, res) => {
    try {
        const { provider, params } = req.body || {};
        const out = await svc.query(provider, params || {});
        // log
        try {
            const pool = getPostgresPool();
            await pool.query(`CREATE TABLE IF NOT EXISTS external_queries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider TEXT NOT NULL,
          params JSONB,
          user_id UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
            await pool.query('INSERT INTO external_queries (provider, params, user_id) VALUES ($1,$2,$3)', [provider, params || {}, req.user?.id || null]);
        }
        catch (e) { /* ignore */ }
        res.json({ success: true, ...out });
    }
    catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});
module.exports = router;
//# sourceMappingURL=externalRoutes.js.map