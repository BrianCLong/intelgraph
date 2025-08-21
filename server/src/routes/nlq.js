const express = require('express');
const NLQService = require('../services/NLQService');
const { ensureAuthenticated } = require('../middleware/auth');
const { evaluate } = require('../services/AccessControl');

const router = express.Router();
const svc = new NLQService();

router.use(ensureAuthenticated);

// POST /api/nlq/generate { prompt }
router.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt required' });
    }
    const result = await svc.generate(prompt);
    // emit estimatedCost to budgeter (placeholder)
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/nlq/executeSandbox { cypher, reason }
router.post('/executeSandbox', async (req, res) => {
  try {
    const { cypher, reason } = req.body || {};
    if (!cypher || typeof cypher !== 'string') {
      return res.status(400).json({ error: 'cypher required' });
    }
    const policy = await evaluate('NLQ_SANDBOX', req.user, { cypher }, { reason });
    if (!policy.allow) {
      return res.status(403).json({ error: policy.reason || 'Access denied' });
    }
    const result = await svc.executeSandbox(cypher);
    return res.json(result);
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message });
  }
});

module.exports = router;
