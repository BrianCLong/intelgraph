"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankPaths = rankPaths;
function rankPaths(paths, opts = {}) {
    const { edgeWeights = {}, nodeCentrality = {}, strategy = "v2", weights = { length: 0.34, edgeType: 0.33, centrality: 0.33 }, } = opts;
    const maxCentrality = Math.max(...Object.values(nodeCentrality), 1);
    const maxEdgeWeight = Math.max(...Object.values(edgeWeights), 1);
    const ranked = paths.map((p) => {
        const length = 1; // current paths are single edges
        const lengthScoreRaw = 1 / length; // higher is better for shorter paths
        const edgeWeight = edgeWeights[p.type || ""] || 1;
        const edgeScoreRaw = edgeWeight / maxEdgeWeight;
        const centralityVal = ((nodeCentrality[p.from] || 0) + (nodeCentrality[p.to] || 0)) / 2;
        const centralityScoreRaw = centralityVal / maxCentrality;
        if (strategy === "v1") {
            const score = lengthScoreRaw;
            return {
                path: p,
                score,
                score_breakdown: { length: score, edgeType: 0, centrality: 0 },
            };
        }
        const breakdown = {
            length: lengthScoreRaw * weights.length,
            edgeType: edgeScoreRaw * weights.edgeType,
            centrality: centralityScoreRaw * weights.centrality,
        };
        return {
            path: p,
            score: breakdown.length + breakdown.edgeType + breakdown.centrality,
            score_breakdown: breakdown,
        };
    });
    return ranked.sort((a, b) => b.score - a.score);
}
exports.default = rankPaths;
//# sourceMappingURL=PathRankingService.js.map