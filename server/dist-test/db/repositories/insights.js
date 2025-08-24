"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsRepo = void 0;
class InsightsRepo {
    constructor(pool) {
        this.pool = pool;
    }
    async insert(row) {
        const q = `INSERT INTO ai_insights (id, job_id, kind, payload, status, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
        const v = [row.id, row.jobId, row.kind, row.payload, row.status, row.createdAt];
        const { rows } = await this.pool.query(q, v);
        return rows[0];
    }
    async findMany({ status, kind } = {}) {
        const cond = [];
        const args = [];
        if (status) {
            args.push(status);
            cond.push(`status = $${args.length}`);
        }
        if (kind) {
            args.push(kind);
            cond.push(`kind = $${args.length}`);
        }
        const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
        const { rows } = await this.pool.query(`SELECT * FROM ai_insights ${where} ORDER BY created_at DESC`, args);
        return rows;
    }
    async update(id, patch) {
        const { rows } = await this.pool.query(`UPDATE ai_insights SET status=$2, decided_at=$3, decided_by=$4 WHERE id=$1 RETURNING *`, [id, patch.status, patch.decidedAt, patch.decidedBy]);
        return rows[0];
    }
    async markApplied(id) {
        await this.pool.query(`UPDATE ai_insights SET applied_at = NOW() WHERE id=$1`, [id]);
    }
}
exports.InsightsRepo = InsightsRepo;
//# sourceMappingURL=insights.js.map