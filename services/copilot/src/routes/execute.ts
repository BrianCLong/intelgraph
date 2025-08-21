import { Router } from 'express';

const WRITE_BLACKLIST = [
  /\bCREATE\b/i,
  /\bMERGE\b/i,
  /\bDELETE\b/i,
  /\bSET\b/i,
  /\bDROP\b/i
];

const r = Router();

r.post('/', (req, res) => {
  const { cypher, limit = 10000 } = req.body || {};
  if (!cypher) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  if (WRITE_BLACKLIST.some(rx => rx.test(cypher))) {
    return res.status(403).json({ error: 'write_operations_forbidden' });
  }
  res.json({ columns: [], rows: [] });
});

export default r;
