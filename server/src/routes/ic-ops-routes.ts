import express from 'express';
import IcOpsController from '../controllers/ic-ops-controller';

const router = express.Router();
router.use(express.json());

router.post('/incidents/declare', (req, res) => IcOpsController.declareIncident(req, res));
router.post('/runbooks/execute/:id', (req, res) => IcOpsController.executeRunbook(req, res));
router.get('/rca/generate/:incidentId', (req, res) => IcOpsController.generateRca(req, res));

export default router;
