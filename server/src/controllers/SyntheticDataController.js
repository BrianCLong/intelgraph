const SyntheticDataService = require('../services/SyntheticDataService');

class SyntheticDataController {
  async train(req, res) {
    try {
      const { dataset, epsilon } = req.body || {};
      const result = await SyntheticDataService.train({ dataset, epsilon });
      res.status(201).json({ success: true, ...result });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  async sample(req, res) {
    try {
      const { modelId, count } = req.body || {};
      const result = await SyntheticDataService.sample({ modelId, count });
      res.status(200).json({ success: true, ...result });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}

module.exports = SyntheticDataController;
