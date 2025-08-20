const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();
router.use(ensureAuthenticated);

function simulateAccess(roleVector = {}, action) {
  const requiredRole = {
    'delete-user': 'Admin',
    'view-report': 'Analyst',
  }[action] || 'Analyst';
  const score = roleVector[requiredRole] || 0;
  return {
    granted: score >= 0.5,
    rationale: `requires ${requiredRole} with score>=0.5`,
    confidence: score,
    overrideHistory: [],
  };
}

router.post('/simulate', async (req, res) => {
  try {
    const { roleVector = {}, action } = req.body || {};
    if (!action) return res.status(400).json({ error: 'action required' });
    const result = simulateAccess(roleVector, action);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
