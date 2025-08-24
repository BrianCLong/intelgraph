class TemplateController {
    constructor(templateService) {
        this.templates = templateService;
    }
    async create(req, res) {
        try {
            const { name, data, scope } = req.body;
            if (!name || !data) {
                return res.status(400).json({ error: "Name and data are required" });
            }
            const ownerId = req.user.id;
            const template = this.templates.createTemplate({
                name,
                data,
                scope,
                ownerId,
            });
            res.status(201).json(template);
        }
        catch (err) {
            console.error("Error creating template", err);
            res.status(500).json({ error: "Failed to create template" });
        }
    }
    async list(req, res) {
        try {
            const scope = req.query.scope;
            const userId = req.user.id;
            const templates = this.templates.listTemplates({ scope, userId });
            res.json({ templates });
        }
        catch (err) {
            console.error("Error listing templates", err);
            res.status(500).json({ error: "Failed to list templates" });
        }
    }
    async get(req, res) {
        try {
            const template = this.templates.getTemplate(req.params.id);
            if (!template)
                return res.status(404).json({ error: "Template not found" });
            res.json(template);
        }
        catch (err) {
            console.error("Error getting template", err);
            res.status(500).json({ error: "Failed to get template" });
        }
    }
    async update(req, res) {
        try {
            const updated = this.templates.updateTemplate(req.params.id, req.body);
            if (!updated)
                return res.status(404).json({ error: "Template not found" });
            res.json(updated);
        }
        catch (err) {
            console.error("Error updating template", err);
            res.status(500).json({ error: "Failed to update template" });
        }
    }
    async delete(req, res) {
        try {
            const ok = this.templates.deleteTemplate(req.params.id);
            if (!ok)
                return res.status(404).json({ error: "Template not found" });
            res.json({ success: true });
        }
        catch (err) {
            console.error("Error deleting template", err);
            res.status(500).json({ error: "Failed to delete template" });
        }
    }
}
module.exports = TemplateController;
//# sourceMappingURL=TemplateController.js.map