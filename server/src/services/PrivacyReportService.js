class PrivacyReportService {
  async getReport(dataset) {
    // TODO: compute actual k-anonymity and DP metrics
    return {
      dataset,
      epsilon: 0,
      delta: 0,
      kAnonymity: null,
    };
  }
}

module.exports = new PrivacyReportService();
