"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaEnforcer = void 0;
const ErrorMonitor_1 = require("./ErrorMonitor");
class SlaEnforcer {
    constructor(deps) {
        this.deps = deps;
    }
    async check(observed, expectedVar, entId, orderId) {
        const { ok, bound } = (0, ErrorMonitor_1.withinErrorBound)(observed, expectedVar);
        if (!ok) {
            await this.deps.orders.credit(orderId);
            await this.deps.entitlements.pause(entId);
            return { refunded: true, bound };
        }
        return { refunded: false, bound };
    }
}
exports.SlaEnforcer = SlaEnforcer;
//# sourceMappingURL=SlaEnforcer.js.map