import { Router } from 'express';
import { z } from 'zod';
import { store } from '../services/store';

const QueryInput = z.object({
  cypher: z.string(),
  time: z.string().datetime().optional(),
  id: z.string().optional()
});

const router = Router();

router.post('/cypher', (req, res) => {
  const parsed = QueryInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.id && parsed.data.time) {
    const entity = store.getEntityAt(parsed.data.id, parsed.data.time) || null;
    return res.json({ entity });
  }
  // For sandboxing, simply echo back; real implementation would validate and run in Neo4j
  res.json({ cypher: parsed.data.cypher, time: parsed.data.time || null });
});

export default router;
