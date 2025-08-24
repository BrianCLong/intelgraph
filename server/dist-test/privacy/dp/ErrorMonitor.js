"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withinErrorBound = withinErrorBound;
function withinErrorBound(observed, expectedVar, z = 1.96) {
    const bound = Math.sqrt(expectedVar) * z;
    return { ok: Math.abs(observed) <= bound, bound };
}
//# sourceMappingURL=ErrorMonitor.js.map