import express from 'express';
import { orbitGateway } from '../services/orbitGateway.js';
import { isEnabled } from '../featureFlags/flagsmith.js';

const router = express.Router();

async function ensureEnabled(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!(await isEnabled('orbit.enabled'))) {
    return res.status(404).send({ error: 'Not Found' });
  }
  next();
}

router.post('/infer', ensureEnabled, async (req, res) => {
  try {
    const { model, input } = req.body;
    const result = await orbitGateway.infer(model, input);
    res.send(result);
  } catch (err: any) {
    res.status(400).send({ error: err.message });
  }
});

router.post('/eval/run', ensureEnabled, async (req, res) => {
  const { model } = req.body;
  const metrics = await orbitGateway.evalRun(model);
  res.send(metrics);
});

router.post('/models/register', ensureEnabled, (req, res) => {
  const { id, backend } = req.body;
  orbitGateway.registerModel(id, backend);
  res.send({ status: 'ok' });
});

router.post('/routes/canary', ensureEnabled, (req, res) => {
  try {
    const { model, canary, traffic } = req.body;
    orbitGateway.registerCanary(model, canary, traffic);
    res.send({ status: 'ok' });
  } catch (err: any) {
    res.status(400).send({ error: err.message });
  }
});

export default router;
