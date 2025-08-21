import { Router } from 'express';
import { withSession } from '../lib/neo';

const WRITE_BLACKLIST = [
  /\bCREATE\b/i,
  /\bMERGE\b/i,
  /\bDELETE\b/i,
  /\bSET\b/i,
  /\bDROP\b/i
];

const r = Router();

r.post('/', async (req, res) => {
  const { cypher, timeoutMs = 5000 } = req.body || {};
  if (!cypher || WRITE_BLACKLIST.some(rx => rx.test(cypher))) {
    return res.status(403).json({ error: 'write_operations_forbidden' });
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const data = await withSession(async s => s.run(cypher, {}, { timeout: timeoutMs }));
    clearTimeout(t);
    res.json({ columns: data.keys, rows: data.records.map((r: any) => r) });
  } catch (e: any) {
    if (controller.signal.aborted) {
      return res.status(408).json({ error: 'timeout' });
    }
    res.status(422).json({ error: 'invalid_or_unsafe_cypher' });
  }
});

export default r;
