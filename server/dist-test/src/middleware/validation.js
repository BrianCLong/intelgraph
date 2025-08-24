"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
function validateRequest(schema) {
    return (req, res, next) => {
        const body = req.body || {};
        // minimal required + basic constraints
        for (const [key, rules] of Object.entries(schema)) {
            if (rules.required && (body[key] === undefined || body[key] === null || body[key] === '')) {
                return res.status(400).json({ error: `Missing required field: ${key}` });
            }
            if (typeof body[key] === 'string') {
                if (rules.minLength && body[key].length < rules.minLength) {
                    return res.status(400).json({ error: `${key} must be at least ${rules.minLength} characters` });
                }
                if (rules.maxLength && body[key].length > rules.maxLength) {
                    return res.status(400).json({ error: `${key} must be at most ${rules.maxLength} characters` });
                }
                if (rules.format === 'uri') {
                    try {
                        new URL(body[key]);
                    }
                    catch {
                        return res.status(400).json({ error: `${key} must be a valid URI` });
                    }
                }
                if (rules.pattern) {
                    const re = new RegExp(rules.pattern);
                    if (!re.test(body[key]))
                        return res.status(400).json({ error: `${key} invalid format` });
                }
            }
        }
        next();
    };
}
//# sourceMappingURL=validation.js.map