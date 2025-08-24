"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_js_1 = require("../src/lib/auth.js");
describe("trace context", () => {
    it("attaches unique requestId to context", async () => {
        const ctx1 = await (0, auth_js_1.getContext)({ req: { headers: {} } });
        const ctx2 = await (0, auth_js_1.getContext)({ req: { headers: {} } });
        expect(ctx1.requestId).toBeDefined();
        expect(ctx2.requestId).toBeDefined();
        expect(ctx1.requestId).not.toBe(ctx2.requestId);
    });
});
//# sourceMappingURL=request-id-context.test.js.map