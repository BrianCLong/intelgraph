import { Router } from 'express';
import { ingestEcsEvents } from '../services/connectors/elasticEcs.js';

const r = Router();

r.post('/connectors/elastic-ecs', async (req, res, next) => {
  try {
    const out = await ingestEcsEvents(req.body?.events || [], { source: req.query.source as string || 'elastic-ecs' });
    res.json(out);
  } catch (e) {
    next(e);
  }
});

export default r;
