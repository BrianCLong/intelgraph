import { Router } from 'express';
import { RelationshipSchema } from '../schema';
import { store } from '../services/store';

const router = Router();

router.post('/', (req, res) => {
  const parse = RelationshipSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const rel = store.upsertRelationship(parse.data);
  res.json(rel);
});

export default router;
