"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deepfakeTriage_1 = require("../ai/deepfakeTriage");
describe("deepfake triage", () => {
    it("returns score, facets, and latency", () => {
        const result = (0, deepfakeTriage_1.deepfakeTriage)(Buffer.from("test"));
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(Array.isArray(result.facets)).toBe(true);
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
});
//# sourceMappingURL=deepfakeTriage.test.js.map