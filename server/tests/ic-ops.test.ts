import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

describe('IC-Ops API', () => {
  let app: express.Express;

  beforeAll(async () => {
    process.env.ICOPS_ENABLED = 'true';
    const { default: icOpsRouter } = await import('../src/routes/ic-ops-routes');
    app = express();
    app.use(express.json());
    app.use('/api/icops', icOpsRouter);
  });

  it('declares incident and executes runbook', async () => {
    const declareRes = await request(app)
      .post('/api/icops/incidents/declare')
      .send({ sev: 'sev1', commander: 'alice', channel: '#inc' });
    expect(declareRes.status).toBe(201);
    const incidentId = declareRes.body.id;

    const runbookRes = await request(app)
      .post('/api/icops/runbooks/execute/sample')
      .send({ incidentId });
    expect(runbookRes.status).toBe(200);
    expect(runbookRes.body.mode).toBe('dry-run');

    const rcaRes = await request(app).get(`/api/icops/rca/generate/${incidentId}`);
    expect(rcaRes.status).toBe(200);
    expect(rcaRes.body.metrics).toHaveProperty('mttrMs');
  });

  it('ignores binary runbooks', async () => {
    const binPath = path.join(process.cwd(), 'runbooks', 'binary.yaml');
    fs.writeFileSync(binPath, Buffer.from([0, 159, 146, 150]));

    const declareRes = await request(app)
      .post('/api/icops/incidents/declare')
      .send({ sev: 'sev2', commander: 'bob', channel: '#inc' });
    const incidentId = declareRes.body.id;

    const res = await request(app)
      .post('/api/icops/runbooks/execute/binary')
      .send({ incidentId });
    expect(res.status).toBe(404);

    fs.unlinkSync(binPath);
  });

  it('rejects runbooks with invalid structure', async () => {
    const invalidPath = path.join(process.cwd(), 'runbooks', 'invalid.yaml');
    fs.writeFileSync(invalidPath, 'icops:\n  enabled: true\nsteps: 123');

    const declareRes = await request(app)
      .post('/api/icops/incidents/declare')
      .send({ sev: 'sev3', commander: 'carol', channel: '#inc' });
    const incidentId = declareRes.body.id;

    const res = await request(app)
      .post('/api/icops/runbooks/execute/invalid')
      .send({ incidentId });
    expect(res.status).toBe(404);

    fs.unlinkSync(invalidPath);
  });
});
