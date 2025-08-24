const { getPostgresPool } = require("../config/database");
class RuleRunnerService {
    constructor(logger, options = {}) {
        this.logger = logger;
        this.intervalMs = options.intervalMs || 60000;
        this.threshold = options.threshold || 0.85; // default confidence threshold
        this.timer = null;
    }
    start() {
        if (this.timer)
            return;
        this.logger &&
            this.logger.info(`RuleRunner starting, interval=${this.intervalMs}ms, threshold=${this.threshold}`);
        this.timer = setInterval(() => this.runOnce().catch((e) => this.logger && this.logger.warn("RuleRunner error", e)), this.intervalMs);
    }
    stop() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = null;
    }
    async runOnce() {
        const pool = getPostgresPool();
        // Look for recent high-confidence analysis results
        const { rows } = await pool.query(`SELECT id, investigation_id, analysis_type, results, confidence_score, created_at
       FROM analysis_results
       WHERE created_at > NOW() - INTERVAL '1 hour' AND confidence_score >= $1
       ORDER BY created_at DESC
       LIMIT 50`, [this.threshold]);
        for (const r of rows) {
            const title = `High confidence ${r.analysis_type}`;
            const message = `Detected ${r.analysis_type} with confidence ${r.confidence_score}.`;
            await pool.query(`INSERT INTO alerts (user_id, type, severity, title, message, link, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                null,
                "model_threshold",
                "warning",
                title,
                message,
                null,
                { analysisId: r.id, investigationId: r.investigation_id },
            ]);
        }
        if (rows.length && this.logger)
            this.logger.info(`RuleRunner created ${rows.length} alerts.`);
    }
}
module.exports = RuleRunnerService;
//# sourceMappingURL=RuleRunnerService.js.map