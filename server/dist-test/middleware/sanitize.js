"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sanitizeRequest;
function escape(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
function sanitize(value) {
    if (typeof value === 'string')
        return escape(value);
    if (Array.isArray(value))
        return value.map(sanitize);
    if (value && typeof value === 'object') {
        const result = {};
        for (const [key, val] of Object.entries(value)) {
            result[key] = sanitize(val);
        }
        return result;
    }
    return value;
}
function sanitizeRequest(req, res, next) {
    if (req.body)
        req.body = sanitize(req.body);
    if (req.query)
        req.query = sanitize(req.query);
    next();
}
//# sourceMappingURL=sanitize.js.map