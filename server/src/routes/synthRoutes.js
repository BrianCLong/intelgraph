const express = require('express');
const SyntheticDataController = require('../controllers/SyntheticDataController');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();
const controller = new SyntheticDataController();

router.use(ensureAuthenticated);

router.post('/train', (req, res) => controller.train(req, res));
router.post('/sample', (req, res) => controller.sample(req, res));

module.exports = router;
