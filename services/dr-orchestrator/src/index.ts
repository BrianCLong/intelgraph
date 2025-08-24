import express from 'express';

const app = express();
app.use(express.json());

app.post('/dr/backup', async (_req, res) => {
  // Placeholder for quiesce calls and backup logic
  res.json({
    artifactUrl: 's3://placeholder',
    sha256: '0000',
    snapshotId: 'snapshot-0',
  });
});

app.post('/dr/restore', (_req, res) => {
  const jobId = `job-${Date.now()}`;
  res.json({ jobId });
});

app.get('/dr/status/:id', (req, res) => {
  res.json({ id: req.params.id, progress: 0, verified: false });
});

export default app;
