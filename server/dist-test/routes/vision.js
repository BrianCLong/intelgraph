const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const VisionService = require('../services/VisionService');
const { writeAudit } = require('../utils/audit');
const router = express.Router();
const vision = new VisionService();
router.use(ensureAuthenticated);
router.post('/analyze', async (req, res) => {
    try {
        const { imageUrl, imageBase64, mode } = req.body || {};
        const input = imageUrl || imageBase64 || JSON.stringify(req.body || {});
        const objects = await vision.analyzeImageObjects(input);
        const micro = await vision.analyzeMicroexpressions(input);
        await writeAudit({ userId: req.user?.id, action: 'VISION_ANALYZE', resourceType: 'Vision', details: { mode: mode || 'auto' } });
        res.json({ ...objects, ...micro });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
//# sourceMappingURL=vision.js.map