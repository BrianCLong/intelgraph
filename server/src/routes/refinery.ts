import express, { Request, Response } from 'express';
import { isEnabled } from '../featureFlags/flagsmith.js';

const router = express.Router();
router.use(express.json());

/**
 * Cost-based advisor for materialized views
 * POST /advisor/plan -> {viewSpec, costDelta, ROI}
 */
router.post('/advisor/plan', async (_req: Request, res: Response) => {
  res.json({ viewSpec: {}, costDelta: 0, ROI: 0 });
});

/**
 * View management endpoints guarded by refinery.auto flag
 */
async function ensureFlag(): Promise<boolean> {
  return isEnabled('refinery.auto');
}

router.post('/views/:id/create', async (_req: Request, res: Response) => {
  if (!(await ensureFlag())) {
    return res.status(202).json({ status: 'advisory-only' });
  }
  res.json({ status: 'created' });
});

router.post('/views/:id/refresh', async (_req: Request, res: Response) => {
  if (!(await ensureFlag())) {
    return res.status(202).json({ status: 'advisory-only' });
  }
  res.json({ status: 'refreshed' });
});

router.post('/views/:id/drop', async (_req: Request, res: Response) => {
  if (!(await ensureFlag())) {
    return res.status(202).json({ status: 'advisory-only' });
  }
  res.json({ status: 'dropped' });
});

/**
 * Metrics endpoint for view health
 * GET /views/:id/health -> {lag, hitRate}
 */
router.get('/views/:id/health', (_req: Request, res: Response) => {
  res.json({ lag: 0, hitRate: 0 });
});

export default router;
