const fs = require('fs');
const request = require('supertest');
const app = require('..');

describe('synthdata service', () => {
  it('generates deterministic graph', async () => {
    const specRes = await request(app)
      .post('/synth/spec')
      .send({ seed: '123', counts: { persons: 2, orgs: 1 } });
    expect(specRes.status).toBe(200);
    const specId = specRes.body.id;
    const gen1 = await request(app).post('/synth/generate').send({ specId });
    const gen2 = await request(app).post('/synth/generate').send({ specId });
    expect(gen1.status).toBe(200);
    expect(gen2.status).toBe(200);
    const g1 = JSON.parse(fs.readFileSync(gen1.body.path, 'utf8'));
    const g2 = JSON.parse(fs.readFileSync(gen2.body.path, 'utf8'));
    expect(g1).toEqual(g2);
  });
});
