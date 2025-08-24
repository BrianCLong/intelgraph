"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAudit = writeAudit;
const crypto_1 = __importDefault(require("crypto"));
const database_js_1 = require("../config/database.js");
function deepDiff(before = {}, after = {}) {
    // Simple structural diff capturing changed keys only
    const changed = {};
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    for (const k of keys) {
        const bv = before?.[k];
        const av = after?.[k];
        const bothObjects = bv && av && typeof bv === 'object' && typeof av === 'object';
        if (bothObjects) {
            const nested = deepDiff(bv, av);
            if (nested && Object.keys(nested).length)
                changed[k] = nested;
        }
        else if (JSON.stringify(bv) !== JSON.stringify(av)) {
            changed[k] = { before: bv, after: av };
        }
    }
    return changed;
}
function signAuditPayload(payload, secret) {
    try {
        const h = crypto_1.default.createHmac('sha256', String(secret));
        h.update(Buffer.from(JSON.stringify(payload)));
        return h.digest('base64');
    }
    catch (_) {
        return null;
    }
}
async function writeAudit({ userId, action, resourceType, resourceId, details = {}, ip, userAgent, actorRole, sessionId, before, after, }) {
    try {
        const pool = (0, database_js_1.getPostgresPool)();
        const enrichedDetails = { ...details };
        if (before || after) {
            enrichedDetails.before = before ?? null;
            enrichedDetails.after = after ?? null;
            enrichedDetails.diff = deepDiff(before || {}, after || {});
        }
        if (actorRole)
            enrichedDetails.actorRole = actorRole;
        if (sessionId)
            enrichedDetails.sessionId = sessionId;
        if (ip)
            enrichedDetails.ip = ip;
        // Signature for integrity
        const secret = process.env.AUDIT_SIGNING_SECRET;
        if (secret) {
            enrichedDetails.signature = signAuditPayload({
                userId: userId || null,
                action,
                resourceType: resourceType || null,
                resourceId: resourceId || null,
                before: enrichedDetails.before ?? null,
                after: enrichedDetails.after ?? null,
                at: new Date().toISOString(),
            }, secret);
        }
        await pool.query(`INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
            userId || null,
            action,
            resourceType || null,
            resourceId || null,
            enrichedDetails,
            ip || null,
            userAgent || null,
        ]);
    }
    catch (e) {
        // non-fatal, avoid throwing in hot paths
    }
}
//# sourceMappingURL=audit.js.map