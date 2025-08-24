"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.perfTrace = perfTrace;
const perf_hooks_1 = require("perf_hooks");
const logger = logger.child({ name: "perfTrace" });
function perfTrace(req, res, next) {
    const start = perf_hooks_1.performance.now();
    res.on("finish", () => {
        const duration = perf_hooks_1.performance.now() - start;
        logger.info({ path: req.path, duration }, "request completed");
    });
    next();
}
//# sourceMappingURL=perfTrace.js.map