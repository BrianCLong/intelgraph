"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const defaultPrompt = zod_1.z.object({
    question: zod_1.z.string().min(3),
});
const defaultOutput = zod_1.z.object({
    answer: zod_1.z.string(),
    confidence: zod_1.z.number(),
    citations: zod_1.z.object({ entityIds: zod_1.z.array(zod_1.z.string()) }),
    why_paths: zod_1.z.array(zod_1.z.object({
        from: zod_1.z.string(),
        to: zod_1.z.string(),
        relId: zod_1.z.string(),
        type: zod_1.z.string(),
        supportScore: zod_1.z.number().optional(),
    })),
});
const graphragConfig = {
    redisUrl: process.env.GRAPHRAG_REDIS_URL,
    useCases: {
        default: {
            promptSchema: defaultPrompt,
            outputSchema: defaultOutput,
            tokenBudget: parseInt(process.env.GRAPHRAG_TOKEN_BUDGET || "2000"),
            latencyBudgetMs: parseInt(process.env.GRAPHRAG_LATENCY_BUDGET_MS || "2000"),
        },
    },
};
exports.default = graphragConfig;
//# sourceMappingURL=graphrag.js.map