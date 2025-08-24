const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const MultiModalService = require('../services/MultiModalService');
const router = express.Router();
const { writeAudit } = require('../utils/audit');
const svc = new MultiModalService();
router.use(ensureAuthenticated);
// POST /api/nlp/tag { text }
router.post('/tag', async (req, res) => {
    try {
        const { text } = req.body || {};
        if (!text || typeof text !== 'string')
            return res.status(400).json({ error: 'text required' });
        const result = await svc.analyzeText(text, {});
        await writeAudit({ userId: req.user?.id, action: 'TAG_TEXT', resourceType: 'NLP', details: { len: text.length } });
        res.json({ tags: result.tokens || [] });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
module.exports = router;
//# sourceMappingURL=nlp.js.map