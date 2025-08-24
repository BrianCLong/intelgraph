const express = require("express");
const TemplateController = require("../controllers/TemplateController");
const templateService = require("../services/TemplateService");
const { ensureAuthenticated } = require("../middleware/auth");
const router = express.Router();
const controller = new TemplateController(templateService);
router.use(ensureAuthenticated);
router.get("/", (req, res) => controller.list(req, res));
router.post("/", (req, res) => controller.create(req, res));
router.get("/:id", (req, res) => controller.get(req, res));
router.put("/:id", (req, res) => controller.update(req, res));
router.delete("/:id", (req, res) => controller.delete(req, res));
module.exports = router;
//# sourceMappingURL=templateRoutes.js.map