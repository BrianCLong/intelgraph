"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = auditLogger;
const audit_js_1 = require("../utils/audit.js");
function auditLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const userId = req.user?.id;
        (0, audit_js_1.writeAudit)({
            userId,
            action: `${req.method} ${req.originalUrl}`,
            resourceType: "http",
            details: { status: res.statusCode, durationMs: Date.now() - start },
            ip: req.ip,
            userAgent: req.get("user-agent"),
        });
    });
    next();
}
//# sourceMappingURL=audit-logger.js.map