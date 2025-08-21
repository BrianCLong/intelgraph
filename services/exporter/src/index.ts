import express from 'express';
import helmet from 'helmet';
import { createExport, ExportRequest } from './exporter';

const app = express();
app.use(express.json());
app.use(helmet());

app.post('/export', async (req, res) => {
  const body = req.body as ExportRequest;
  try {
    const zip = await createExport(body);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="export.zip"');
    res.send(zip);
  } catch (err) {
    res.status(400).json({ error: 'export_failed' });
  }
});

export default app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Exporter listening on ${port}`));
}
