const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const MLController = require('../controllers/MLController');
const router = express.Router();
const controller = new MLController();
router.use(ensureAuthenticated);
router.post('/train', async (req, res) => {
    await controller.trainModel(req, res);
});
router.post('/suggest-links', async (req, res) => {
    await controller.suggestLinks(req, res);
});
module.exports = router;
//# sourceMappingURL=mlRoutes.js.map