const { rankPaths } = require("../src/services/PathRankingService");
describe("PathRankingService", () => {
    test("v2 ranking improves top1 path alignment", () => {
        const paths = [
            { from: "A", to: "B", relId: "r1", type: "WEAK" },
            { from: "A", to: "C", relId: "r2", type: "STRONG" },
        ];
        const edgeWeights = { WEAK: 0.5, STRONG: 1 };
        const nodeCentrality = { A: 1, B: 0.2, C: 0.9 };
        const baseline = rankPaths(paths, {
            edgeWeights,
            nodeCentrality,
            strategy: "v1",
        });
        const v2 = rankPaths(paths, {
            edgeWeights,
            nodeCentrality,
            strategy: "v2",
        });
        expect(baseline[0].path.relId).toBe("r1");
        expect(v2[0].path.relId).toBe("r2");
        const baselineAcc = baseline[0].path.relId === "r2" ? 1 : 0;
        const v2Acc = v2[0].path.relId === "r2" ? 1 : 0;
        expect(v2Acc - baselineAcc).toBeGreaterThanOrEqual(0.15);
        expect(v2[0].score_breakdown).toHaveProperty("edgeType");
    });
});
//# sourceMappingURL=PathRankingService.test.js.map