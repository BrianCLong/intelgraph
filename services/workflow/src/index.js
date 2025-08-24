import express from 'express';
import { workflowRouter } from './routes.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(workflowRouter);
  return app;
}

export default createApp();
