import express from 'express';
import request from 'supertest';
import fs from 'fs';
import { telemetryMiddleware, telemetryErrorMiddleware } from '../src/middleware/telemetry.js';

describe('telemetry middleware', () => {
  const file = 'test-telemetry.log';

  beforeEach(() => {
    process.env.TELEMETRY_CONSENT = 'true';
    process.env.TELEMETRY_STORAGE = 'device';
    process.env.TELEMETRY_SAMPLE_PCT = '100';
    process.env.TELEMETRY_SINK = 'file';
    process.env.TELEMETRY_FILE = file;
  });

  afterEach(() => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });

  test('logs start and completion', async () => {
    const app = express();
    app.use(telemetryMiddleware);
    app.get('/ok', (_req, res) => res.send('ok'));
    app.use(telemetryErrorMiddleware);
    await request(app).get('/ok').expect(200);
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    const types = lines.map((l) => JSON.parse(l).type);
    expect(types).toContain('task_started');
    expect(types).toContain('task_completed');
  });

  test('logs error', async () => {
    const app = express();
    app.use(telemetryMiddleware);
    app.get('/err', () => {
      throw new Error('boom');
    });
    app.use(telemetryErrorMiddleware);
    await request(app).get('/err').expect(500);
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    const types = lines.map((l) => JSON.parse(l).type);
    expect(types).toContain('error');
  });
});
