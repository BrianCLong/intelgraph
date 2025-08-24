import express from 'express';
import request from 'supertest';
import { router } from '../../services/nlq/src/index.js';

const app = express();
app.use(express.json());
app.use(router);

describe('nlq routes', () => {
  it('compiles natural language to cypher', async () => {
    const res = await request(app).post('/nlq/compile').send({ nl: 'find all people' });
    expect(res.body.cypher).toBe('MATCH (p:Person) RETURN p LIMIT $limit');
  });
});
