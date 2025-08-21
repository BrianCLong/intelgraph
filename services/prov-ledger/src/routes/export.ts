import { Router } from 'express';
import { withSession } from '../lib/neo';
import { buildManifest } from '../lib/manifest';

const r = Router();

r.get('/:id/export', async (req, res) => {
  const { id } = req.params;
  const result = await withSession(async s =>
    s.run(
      `MATCH (c:Claim {id: $id})-[:SUPPORTED_BY]->(:Evidence)<-[:PART_OF]-(a:Artifact)
       RETURN a.id AS id, a.sha256 AS sha256, a.url AS url`,
      { id }
    )
  );
  const artifacts = result.records.map((r: any) => ({
    id: r.get('id'),
    sha256: r.get('sha256'),
    url: r.get('url'),
  }));
  if (!artifacts.length) return res.status(404).json({ error: 'bundle_not_found' });
  const manifest = buildManifest(artifacts);
  res.json({ manifest, artifacts });
});

export default r;
