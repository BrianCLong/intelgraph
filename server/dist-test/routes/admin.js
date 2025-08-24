const express = require("express");
const fs = require("fs");
const path = require("path");
const { ensureAuthenticated, requirePermission, } = require("../middleware/auth");
const { getPostgresPool } = require("../config/database");
const router = express.Router();
router.use(ensureAuthenticated, requirePermission("admin:access"));
router.get("/users", async (req, res) => {
    try {
        const pool = getPostgresPool();
        const { rows } = await pool.query("SELECT id, email, username, first_name, last_name, role, is_active, last_login FROM users ORDER BY created_at DESC LIMIT 200");
        res.json(rows.map((r) => ({
            id: r.id,
            email: r.email,
            username: r.username,
            firstName: r.first_name,
            lastName: r.last_name,
            role: r.role,
            isActive: r.is_active,
            lastLogin: r.last_login,
        })));
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.patch("/users/:id/role", async (req, res) => {
    try {
        const { role } = req.body || {};
        if (!role || !["ADMIN", "ANALYST", "VIEWER", "EDITOR"].includes(role)) {
            return res.status(400).json({ error: "invalid role" });
        }
        const id = req.params.id;
        const pool = getPostgresPool();
        await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// OSINT feed ranking configuration
const cfgPath = path.join(process.cwd(), "server/config/osint-feed-config.json");
router.get("/osint-feed-config", (req, res) => {
    try {
        const txt = fs.readFileSync(cfgPath, "utf8");
        res.json(JSON.parse(txt));
    }
    catch (e) {
        res.json({
            qualityWeight: 0.4,
            recencyWeight: 0.3,
            semanticDensityWeight: 0.3,
        });
    }
});
router.post("/osint-feed-config", (req, res) => {
    try {
        const { qualityWeight, recencyWeight, semanticDensityWeight } = req.body || {};
        const cfg = {
            qualityWeight: Number(qualityWeight),
            recencyWeight: Number(recencyWeight),
            semanticDensityWeight: Number(semanticDensityWeight),
        };
        fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Policy simulation endpoint (PBAC/OPA preview)
router.post("/policy/preview", async (req, res) => {
    try {
        const { action, user, resource, env } = req.body || {};
        const { evaluate } = require("../services/AccessControl");
        const decision = await evaluate(action, user || req.user, resource || {}, env || {});
        res.json({ decision });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
//# sourceMappingURL=admin.js.map