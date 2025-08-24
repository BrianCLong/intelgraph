import { Router } from 'express';
import { z } from 'zod';
import { EntitySchema } from '../schema';
import {
  scoreEntities,
  enqueueCandidate,
  decide,
  getExplanation,
  listCandidates,
} from '../services/er';

const CandidateInput = z.object({
  entities: z.array(EntitySchema),
});

const DecideInput = z.object({
  candidateId: z.string(),
  approved: z.boolean(),
  user: z.string(),
});

const router = Router();

router.post('/candidates', (req, res) => {
  const parsed = CandidateInput.safeParse(req.body);
  if (!parsed.success || parsed.data.entities.length !== 2) {
    return res.status(400).json({ error: 'two entities required' });
  }
  const [a, b] = parsed.data.entities;
  const score = scoreEntities(a, b);
  enqueueCandidate(score);
  res.json(score);
});

router.get('/candidates', (_req, res) => {
  res.json(listCandidates());
});

router.post('/decide', (req, res) => {
  const parsed = DecideInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  decide(parsed.data.candidateId, parsed.data.approved, parsed.data.user);
  res.json({ status: 'ok' });
});

router.get('/explanations/:id', (req, res) => {
  const explanation = getExplanation(req.params.id);
  if (!explanation) return res.status(404).json({ error: 'not found' });
  res.json(explanation);
});

export default router;
