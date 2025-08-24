const express = require('express');
const ReportController = require('../controllers/ReportController');
const { ensureAuthenticated } = require('../middleware/auth');
const router = express.Router();
const controller = new ReportController(console);
router.use(ensureAuthenticated);
router.post('/generate', async (req, res) => {
    await controller.generate(req, res);
});
module.exports = router;
//# sourceMappingURL=reportRoutes.js.map