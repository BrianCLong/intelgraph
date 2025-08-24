import express from 'express';
import { appendRecord, createManifest, recordSchema, chain } from './ledger.js';

const app = express();
app.use(express.json());

function handle(type) {
  return (req, res) => {
    const parsed = recordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const entry = appendRecord(type, parsed.data);
    res.json(entry);
  };
}

app.post('/claims', handle('claim'));
app.post('/evidence', handle('evidence'));
app.post('/transform', handle('transform'));

app.post('/export/manifests', (_req, res) => {
  const { manifest, sha256 } = createManifest();
  res.json({ manifestUrl: 'memory://manifest', sha256, manifest });
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`prov-ledger listening on ${port}`));
}

export { app, appendRecord, chain };
