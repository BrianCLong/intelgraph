import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';

const router = express.Router();

router.use(ensureAuthenticated);

router.post('/preview', (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text required' });
  }
  const cypher = 'MATCH (n) RETURN n LIMIT 10';
  const rationale = 'Demo rationale for generated Cypher';
  const risk = 'low';
  res.json({ cypher, rationale, risk });
});

function checkPolicy(query: string): { allow: boolean; reason?: string } {
  if (/\bDELETE\b/i.test(query)) {
    return { allow: false, reason: 'Delete operations are not permitted' };
  }
  return { allow: true };
}

router.post('/run', async (req, res) => {
  const { cypher, confirm } = req.body || {};
  if (!confirm) {
    return res.status(400).json({ error: 'confirmation required' });
  }
  if (!cypher || typeof cypher !== 'string') {
    return res.status(400).json({ error: 'cypher required' });
  }
  const decision = checkPolicy(cypher);
  if (!decision.allow) {
    await writeAudit({
      userId: req.user?.id,
      action: 'RUN_CYPHER_DENIED',
      resourceType: 'cypher',
      details: { cypher, reason: decision.reason },
    });
    return res.status(403).json({ error: decision.reason });
  }
  const result = { rows: [] };
  await writeAudit({
    userId: req.user?.id,
    action: 'RUN_CYPHER',
    resourceType: 'cypher',
    details: { cypher },
  });
  res.json({ result, auditId: 'placeholder' });
});

export default router;
