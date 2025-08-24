const express = require('express');
const { ensureAuthenticated, requireRole } = require('../middleware/auth');
const { getPostgresPool } = require('../config/database');
const router = express.Router();
router.use(ensureAuthenticated);
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.pageSize || req.query.limit || '50', 10), 500);
        const page = Math.max(parseInt(req.query.page || '0', 10), 0);
        const offset = page * limit;
        const action = (req.query.action || '').trim();
        const resource = (req.query.resource || '').trim();
        const pool = getPostgresPool();
        const where = ['user_id = $1'];
        const params = [req.user.id];
        if (action) {
            where.push('action ILIKE $' + (params.length + 1));
            params.push(`%${action}%`);
        }
        if (resource) {
            where.push('(resource_type ILIKE $' + (params.length + 1) + ' OR resource_id ILIKE $' + (params.length + 2) + ')');
            params.push(`%${resource}%`, `%${resource}%`);
        }
        const whereSql = where.join(' AND ');
        const listSql = `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
                     FROM audit_logs WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const countSql = `SELECT COUNT(*)::int AS c FROM audit_logs WHERE ${whereSql}`;
        const listRes = await pool.query(listSql, [...params, limit, offset]);
        const countRes = await pool.query(countSql, params);
        res.json({ items: listRes.rows, total: countRes.rows[0].c, page, pageSize: limit });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/all', requirePermission('activity:read_all'), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.pageSize || req.query.limit || '100', 10), 1000);
        const page = Math.max(parseInt(req.query.page || '0', 10), 0);
        const offset = page * limit;
        const action = (req.query.action || '').trim();
        const resource = (req.query.resource || '').trim();
        const pool = getPostgresPool();
        const where = [];
        const params = [];
        if (action) {
            where.push('action ILIKE $' + (params.length + 1));
            params.push(`%${action}%`);
        }
        if (resource) {
            where.push('(resource_type ILIKE $' + (params.length + 1) + ' OR resource_id ILIKE $' + (params.length + 2) + ')');
            params.push(`%${resource}%`, `%${resource}%`);
        }
        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const listSql = `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
                     FROM audit_logs ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        const countSql = `SELECT COUNT(*)::int AS c FROM audit_logs ${whereSql}`;
        const listRes = await pool.query(listSql, [...params, limit, offset]);
        const countRes = await pool.query(countSql, params);
        res.json({ items: listRes.rows, total: countRes.rows[0].c, page, pageSize: limit });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
//# sourceMappingURL=activity.js.map