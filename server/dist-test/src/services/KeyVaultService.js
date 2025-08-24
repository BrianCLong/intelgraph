const { getPostgresPool } = require("../config/database");
class KeyVaultService {
    constructor() {
        this.pool = getPostgresPool();
    }
    async addKey(provider, key, expiresAt = null) {
        const res = await this.pool.query(`INSERT INTO api_keys (provider, key, expires_at) VALUES ($1,$2,$3) RETURNING id`, [provider, key, expiresAt]);
        return res.rows[0].id;
    }
    async getActiveKey(provider) {
        const res = await this.pool.query(`SELECT id, key, expires_at FROM api_keys WHERE provider = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`, [provider]);
        return res.rows[0] || null;
    }
    async rotateKey(provider, newKey, expiresAt = null) {
        await this.pool.query(`UPDATE api_keys SET status = 'inactive' WHERE provider=$1 AND status='active'`, [provider]);
        return this.addKey(provider, newKey, expiresAt);
    }
}
module.exports = KeyVaultService;
//# sourceMappingURL=KeyVaultService.js.map