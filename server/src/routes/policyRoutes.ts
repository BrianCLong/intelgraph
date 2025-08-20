import express from 'express';

const router = express.Router();

interface PolicyRequest {
  action: string;
  resource: string;
  attributes?: Record<string, unknown>;
}

router.post('/check', async (req, res) => {
  const { action, resource, attributes } = req.body as PolicyRequest;

  if (!action || !resource) {
    return res.status(400).json({ error: "Missing 'action' or 'resource'" });
  }

  // TODO: Integrate with OPA for real policy evaluation
  const allowed = true;
  const reason = 'Policy engine not yet integrated';

  res.json({ allowed, reason, action, resource, attributes });
});

export default router;
