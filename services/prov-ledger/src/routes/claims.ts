import { Router } from 'express';
import { withSession } from '../lib/neo';

const r = Router();

r.post('/', async (req, res) => {
  const { statement, evidenceIds, attribution, confidence } = req.body || {};
  if (!statement || !Array.isArray(evidenceIds) || evidenceIds.length === 0) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const id = 'cl_' + Date.now().toString(36);
  await withSession(async s => {
    await s.run(
      `CREATE (c:Claim {id: $id, statement: $statement, attribution: $attribution, confidence: $confidence, createdAt: datetime()})
       WITH c
       UNWIND $evidenceIds AS eid
       MATCH (e:Evidence {id: eid})
       CREATE (c)-[:SUPPORTED_BY]->(e)
       RETURN c.id AS id`,
      { id, statement, attribution: attribution ?? null, confidence: confidence ?? null, evidenceIds }
    );
  });
  res.status(201).json({ id });
});

export default r;
