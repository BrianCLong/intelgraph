import { Router } from 'express';
import { generateCypher, estimateCost, guardrails } from '../lib/prompt';

const r = Router();

r.post('/', (req, res) => {
  const { prompt, context } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length < 4) {
    return res.status(400).json({ error: 'invalid_prompt' });
  }
  const cypher = generateCypher(prompt, context);
  const warnings = guardrails(cypher);
  const estimate = estimateCost(cypher);
  res.json({ cypher, estimate, warnings });
});

export default r;
