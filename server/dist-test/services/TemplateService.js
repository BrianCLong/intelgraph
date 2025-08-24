class TemplateService {
    constructor() {
        this.templates = new Map();
    }
    createTemplate({ name, data, scope = "org", ownerId }) {
        const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const now = new Date();
        const template = {
            id,
            name,
            data,
            scope: scope === "personal" ? "personal" : "org",
            ownerId: scope === "personal" ? ownerId : null,
            createdAt: now,
            updatedAt: now,
        };
        this.templates.set(id, template);
        return template;
    }
    listTemplates({ scope, userId } = {}) {
        let result = Array.from(this.templates.values());
        if (scope === "org") {
            result = result.filter((t) => t.scope === "org");
        }
        else if (scope === "personal") {
            result = result.filter((t) => t.scope === "personal" && t.ownerId === userId);
        }
        return result;
    }
    getTemplate(id) {
        return this.templates.get(id);
    }
    updateTemplate(id, updates) {
        const existing = this.templates.get(id);
        if (!existing)
            return null;
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        this.templates.set(id, updated);
        return updated;
    }
    deleteTemplate(id) {
        return this.templates.delete(id);
    }
}
module.exports = new TemplateService();
//# sourceMappingURL=TemplateService.js.map