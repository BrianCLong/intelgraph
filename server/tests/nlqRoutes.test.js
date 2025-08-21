const request = require('supertest');
const express = require('express');

jest.mock('../src/config/database', () => ({
  getNeo4jDriver: () => ({
    session: () => ({
      run: jest.fn().mockResolvedValue({ summary: {}, records: [] }),
      close: jest.fn().mockResolvedValue(),
    }),
  }),
}));

jest.mock('../src/middleware/auth', () => ({
  ensureAuthenticated: (req, _res, next) => {
    req.user = { id: 'test-user' };
    next();
  },
}));

jest.mock('../src/services/AccessControl', () => ({
  evaluate: async () => ({ allow: true }),
}));

const router = require('../src/routes/nlq');

const app = express();
app.use(express.json());
app.use('/api/nlq', router);

describe('NLQ API', () => {
  test('generate returns cypher', async () => {
    const res = await request(app).post('/api/nlq/generate').send({ prompt: 'nodes' });
    expect(res.status).toBe(200);
    expect(res.body.cypher).toBeTruthy();
    expect(res.body.readonly).toBe(true);
  });

  test('sandbox blocks writes', async () => {
    const res = await request(app).post('/api/nlq/executeSandbox').send({ cypher: 'CREATE (n)' });
    expect(res.status).toBe(403);
  });
});
