"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HybridEntityResolutionService_1 = require("../src/services/HybridEntityResolutionService");
describe("HybridEntityResolutionService", () => {
    it("returns deterministic results", async () => {
        const a = "Jon Smith";
        const b = "John Smith";
        const r1 = await (0, HybridEntityResolutionService_1.resolveEntities)(a, b);
        const r2 = await (0, HybridEntityResolutionService_1.resolveEntities)(a, b);
        expect(r1.score).toBeCloseTo(r2.score, 5);
        expect(r1.match).toBe(r2.match);
        expect(r1.explanation).toEqual(r2.explanation);
    });
});
//# sourceMappingURL=hybrid-er.service.test.js.map