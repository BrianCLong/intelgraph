"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepfakeTriage = deepfakeTriage;
function runInference(_media) {
    // Placeholder inference producing a deterministic but simple score
    return Math.floor(Math.random() * 101);
}
function explain(_media) {
    // Placeholder explanation facets
    return [];
}
function deepfakeTriage(media, meta = {}) {
    const start = Date.now();
    const score = runInference(media);
    const facets = explain(media);
    const latencyMs = meta.latencyMs ?? Date.now() - start;
    return { score, facets, latencyMs };
}
//# sourceMappingURL=deepfakeTriage.js.map