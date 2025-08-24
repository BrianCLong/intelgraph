import express from 'express';
import { MultiDomainCorrelationService } from '../services/MultiDomainCorrelationService.js';

const router = express.Router();
const service = new MultiDomainCorrelationService();

router.use(express.json());

router.post('/correlate', (req, res) => {
  const entities = req.body as any[];
  const alerts = service.correlate(entities);
  res.json({ alerts });
});

export default router;
