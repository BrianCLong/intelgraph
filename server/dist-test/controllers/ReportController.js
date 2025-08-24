const ReportService = require('../services/ReportService');
class ReportController {
    constructor(logger) {
        this.svc = new ReportService(logger);
    }
    async generate(req, res) {
        try {
            const { investigationId, title, findings, evidence, metadata, format, zip } = req.body || {};
            const result = await this.svc.generate({ investigationId, title, findings, evidence, metadata, format, zip });
            res.status(201).json({ success: true, ...result });
        }
        catch (e) {
            res.status(400).json({ success: false, error: e.message });
        }
    }
}
module.exports = ReportController;
//# sourceMappingURL=ReportController.js.map