import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express from 'express';

const templatesDir = path.join(process.cwd(), 'templates', 'reports');

export function listTemplates() {
  return fs
    .readdirSync(templatesDir)
    .filter(f => f.endsWith('.json'))
    .map(file => {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(templatesDir, file), 'utf-8')
      );
      return { id: manifest.id, version: manifest.version };
    });
}

export function renderReport(templateId: string, format: 'pdf' | 'csv' | 'json', data: Record<string, any>) {
  const manifestFile = fs
    .readdirSync(templatesDir)
    .find(f => f.startsWith(templateId) && f.endsWith('.json'));
  if (!manifestFile) {
    throw new Error('Template not found');
  }
  const manifestPath = path.join(templatesDir, manifestFile);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const content = JSON.stringify({ manifest, data });
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  const outputPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  const fileName = `${sha256}.${format}`;
  fs.writeFileSync(path.join(outputPath, fileName), content);
  const manifestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(manifest))
    .digest('hex');
  return {
    url: `/downloads/${fileName}`,
    sha256,
    provenanceBlock: {
      manifestHash,
      generatedAt: new Date().toISOString()
    }
  };
}

export const router = express.Router();

router.get('/reports/templates', (_req, res) => {
  res.json(listTemplates());
});

router.post('/reports/render', (req, res) => {
  const { templateId, format, data } = req.body;
  const result = renderReport(templateId, format, data);
  res.json(result);
});
