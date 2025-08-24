import express from 'express';
import { json } from 'body-parser';
import entities from './routes/entities';
import relationships from './routes/relationships';
import er from './routes/er';
import query from './routes/query';
import { correlationId } from './middleware/correlationId';

const app = express();
app.use(json());
app.use(correlationId);

app.use('/api/v1/entities', entities);
app.use('/api/v1/relationships', relationships);
app.use('/api/v1/er', er);
app.use('/api/v1/query', query);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`graph-core listening on ${port}`);
  });
}

export default app;
