"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackRepo = void 0;
class FeedbackRepo {
    constructor(pool) {
        this.pool = pool;
    }
    async insert(row) {
        const q = `INSERT INTO ml_feedback (id, insight_id, decision, created_at) VALUES ($1,$2,$3,$4)`;
        await this.pool.query(q, [row.id, row.insightId, row.decision, row.createdAt]);
    }
    async findByInsight(insightId) {
        const { rows } = await this.pool.query(`SELECT * FROM ml_feedback WHERE insight_id = $1 ORDER BY created_at DESC`, [insightId]);
        return rows;
    }
    async getDecisionMetrics(startDate, endDate) {
        let whereClause = '';
        const params = [];
        if (startDate) {
            params.push(startDate);
            whereClause += `WHERE created_at >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            whereClause += whereClause ? ` AND created_at <= $${params.length}` : `WHERE created_at <= $${params.length}`;
        }
        const { rows } = await this.pool.query(`SELECT decision, COUNT(*) as count FROM ml_feedback ${whereClause} GROUP BY decision`, params);
        return rows.reduce((acc, row) => {
            acc[row.decision] = parseInt(row.count);
            return acc;
        }, {});
    }
}
exports.FeedbackRepo = FeedbackRepo;
//# sourceMappingURL=feedback.js.map