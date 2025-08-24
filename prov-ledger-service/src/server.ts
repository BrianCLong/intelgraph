import Fastify from 'fastify';
import { z } from 'zod';
import { registerEvidence, createClaim, buildManifest, checkLicenses } from './ledger';
import tar from 'tar-stream';
import { createGzip } from 'zlib';

const app = Fastify({ logger: true });

const evidenceSchema = z.object({
  contentHash: z.string(),
  licenseId: z.string(),
  source: z.string(),
  transforms: z.array(z.string()).default([]),
});

app.post('/evidence/register', async (req, reply) => {
  const body = evidenceSchema.parse(req.body);
  const evid = registerEvidence({ ...body });
  reply.send({ evidenceId: evid.id });
});

const claimSchema = z.object({
  evidenceId: z.array(z.string()),
  text: z.string(),
  confidence: z.number(),
  links: z.array(z.string()).default([]),
});

app.post('/claims', async (req, reply) => {
  const body = claimSchema.parse(req.body);
  const claim = createClaim({
    evidenceIds: body.evidenceId,
    text: body.text,
    confidence: body.confidence,
    links: body.links,
  });
  reply.send({ claimId: claim.id });
});

const exportSchema = z.object({ claimId: z.array(z.string()) });

app.post('/exports', async (req, reply) => {
  const body = exportSchema.parse(req.body);
  const manifest = buildManifest(body.claimId);
  const licenseCheck = checkLicenses(manifest.licenses);
  if (!licenseCheck.valid) {
    reply.status(400).send({ error: licenseCheck.reason, appealCode: licenseCheck.appealCode });
    return;
  }
  const pack = tar.pack();
  pack.entry({ name: 'manifest.json' }, JSON.stringify(manifest, null, 2));
  pack.finalize();
  reply.header('Content-Type', 'application/gzip');
  reply.header('Content-Disposition', 'attachment; filename="bundle.tgz"');
  reply.send(pack.pipe(createGzip()));
});

if (require.main === module) {
  app.listen({ port: 3000, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}

export default app;
