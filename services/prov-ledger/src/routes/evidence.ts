import { Router } from 'express';
import { withSession } from '../lib/neo';
import { logger } from '../lib/logger';

const r = Router();

r.post('/', async (req, res) => {
  const { source, license, confidence, artifacts } = req.body || {};
  if (!source || !license || !Array.isArray(artifacts) || artifacts.length === 0) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  try {
    const id = 'ev_' + Date.now().toString(36);
    await withSession(async s => {
      await s.run(
        `CREATE (e:Evidence {id: $id, source: $source, license: $license, confidence: $confidence, createdAt: datetime()})
         WITH e
         UNWIND $artifacts AS a
         CREATE (ar:Artifact {id: a.id, sha256: a.sha256, url: a.url})-[:PART_OF]->(e)
         RETURN e.id AS id`,
        { id, source, license, confidence: confidence ?? null, artifacts }
      );
    });
    res.status(201).json({ id });
  } catch (e) {
    logger.error({ e }, 'evidence_create_failed');
    res.status(500).json({ error: 'internal_error' });
  }
});

export default r;
