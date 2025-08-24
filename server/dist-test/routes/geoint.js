const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const GeointService = require('../services/GeointService');
const router = express.Router();
const svc = new GeointService();
router.use(ensureAuthenticated);
// POST /api/geoint/time-series { points: [{latitude,longitude,timestamp}], intervalMinutes }
router.post('/time-series', async (req, res) => {
    try {
        const { points, intervalMinutes } = req.body || {};
        const out = svc.buildTimeSeries(points || [], intervalMinutes || 60);
        res.json(out);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// POST /api/geoint/clusters { points: [{latitude,longitude}], epsilonKm, minPoints }
router.post('/clusters', async (req, res) => {
    try {
        const { points, epsilonKm, minPoints } = req.body || {};
        const out = svc.detectActivityClusters(points || [], epsilonKm || 0.1, minPoints || 3);
        res.json(out);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
//# sourceMappingURL=geoint.js.map