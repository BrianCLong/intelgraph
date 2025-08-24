import express from 'express';
import { z } from 'zod';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const recordSchema = z.object({
  id: z.string(),
  license: z.string().default(''),
  source: z.string().default('')
});

const chain = [];
const manifests = new Map();

function appendRecord(type, data) {
  const prevHash = chain.length ? chain[chain.length - 1].hash : '';
  const timestamp = new Date().toISOString();
  const record = { type, data, timestamp, prevHash };
  const hash = crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
  const entry = { ...record, hash };
  chain.push(entry);
  return entry;
}

app.post('/claims', (req, res) => {
  const parsed = recordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const entry = appendRecord('claim', parsed.data);
  res.json(entry);
});

app.post('/evidence', (req, res) => {
  const parsed = recordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const entry = appendRecord('evidence', parsed.data);
  res.json(entry);
});

app.post('/transform', (req, res) => {
  const parsed = recordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const entry = appendRecord('transform', parsed.data);
  res.json(entry);
});

app.post('/export/manifests', (_req, res) => {
  const id = crypto.randomUUID();
  const manifest = { records: chain };
  const manifestJson = JSON.stringify(manifest);
  const sha256 = crypto.createHash('sha256').update(manifestJson).digest('hex');
  manifests.set(id, manifest);
  res.json({ manifestUrl: `/export/manifests/${id}`, sha256 });
});

app.get('/export/manifests/:id', (req, res) => {
  const manifest = manifests.get(req.params.id);
  if (!manifest) return res.status(404).json({ error: 'not found' });
  res.json(manifest);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`prov-ledger listening on ${port}`));
}

export { app, appendRecord, chain };
