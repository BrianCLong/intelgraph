const express = require('express');
const PrivacyReportController = require('../controllers/PrivacyReportController');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();
const controller = new PrivacyReportController();

router.use(ensureAuthenticated);

router.get('/report/:dataset', (req, res) => controller.get(req, res));

module.exports = router;
