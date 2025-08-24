"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeContent = analyzeContent;
function analyzeContent(content) {
    const text = content.toLowerCase();
    const suspiciousKeywords = ["deepfake", "manipulated", "fake"];
    const manipulationDetected = suspiciousKeywords.some((k) => text.includes(k));
    const targets = Array.from(new Set(content.match(/@([\w-]+)/g) || [])).map((t) => t.slice(1));
    return {
        isDeepfake: manipulationDetected,
        confidence: manipulationDetected ? 0.9 : 0,
        manipulated: manipulationDetected,
        affectedTargets: targets,
    };
}
//# sourceMappingURL=deepfakeSentinel.js.map