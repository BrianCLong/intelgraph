const PrivacyReportService = require('../services/PrivacyReportService');

class PrivacyReportController {
  constructor() {
    this.svc = PrivacyReportService;
  }

  async get(req, res) {
    try {
      const { dataset } = req.params;
      const report = await this.svc.getReport(dataset);
      res.status(200).json({ success: true, report });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}

module.exports = PrivacyReportController;
