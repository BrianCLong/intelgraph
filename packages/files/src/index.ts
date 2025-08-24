import express from 'express';
import multer from 'multer';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });
const app = express();

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'file required' });
  }
  const hash = createHash('sha256');
  const stream = fs.createReadStream(file.path);
  stream.on('data', (d) => hash.update(d));
  stream.on('end', () => {
    const digest = hash.digest('hex');
    res.json({ filename: file.originalname, size: file.size, hash: digest });
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(4020, () => {
  console.log('files service running on 4020');
});
