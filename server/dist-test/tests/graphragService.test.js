"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GraphRAGService_js_1 = require("../services/GraphRAGService.js");
const metrics_js_1 = require("../monitoring/metrics.js");
const errors_js_1 = require("../lib/errors.js");
describe("GraphRAGService", () => {
    const baseRequest = {
        investigationId: "inv1",
        question: "What is testing?",
    };
    function createService(llmResponses) {
        const neo4jSession = {
            run: jest.fn().mockResolvedValue({
                records: [
                    {
                        get: (field) => {
                            if (field === "nodes") {
                                return [
                                    {
                                        properties: {
                                            id: "e1",
                                            type: "Entity",
                                            label: "Entity1",
                                            properties: "{}",
                                            confidence: 1,
                                        },
                                    },
                                ];
                            }
                            if (field === "relationships") {
                                return [
                                    {
                                        properties: {
                                            id: "r1",
                                            type: "REL",
                                            fromEntityId: "e1",
                                            toEntityId: "e1",
                                            properties: "{}",
                                            confidence: 1,
                                        },
                                    },
                                ];
                            }
                            return null;
                        },
                    },
                ],
            }),
            close: jest.fn(),
        };
        const neo4jDriver = { session: () => neo4jSession };
        const store = new Map();
        const redis = {
            get: jest.fn(async (key) => store.get(key) || null),
            setex: jest.fn(async (key, _ttl, val) => {
                store.set(key, val);
            }),
        };
        const llmService = {
            complete: jest.fn(async () => llmResponses.shift()),
        };
        const embeddingService = {
            generateEmbedding: jest.fn(async () => [0.1]),
        };
        const service = new GraphRAGService_js_1.GraphRAGService(neo4jDriver, llmService, embeddingService, redis);
        return { service, neo4jSession, llmService };
    }
    beforeEach(() => {
        metrics_js_1.graphragSchemaFailuresTotal.reset();
        metrics_js_1.graphragCacheHitRatio.set(0);
    });
    test("returns valid response and uses cache", async () => {
        const valid = JSON.stringify({
            answer: "Test",
            confidence: 0.9,
            citations: { entityIds: ["e1"] },
            why_paths: [
                { from: "e1", to: "e1", relId: "r1", type: "REL" },
            ],
        });
        const { service, neo4jSession } = createService([valid, valid]);
        const first = await service.answer(baseRequest);
        expect(first.answer).toBe("Test");
        expect(metrics_js_1.graphragCacheHitRatio.get().values[0].value).toBe(0);
        const second = await service.answer(baseRequest);
        expect(second.answer).toBe("Test");
        expect(metrics_js_1.graphragCacheHitRatio.get().values[0].value).toBeCloseTo(0.5);
        expect(neo4jSession.run).toHaveBeenCalledTimes(1);
    });
    test("throws user-facing error with trace id on invalid output", async () => {
        const { service } = createService(["not-json", "not-json"]);
        await expect(service.answer(baseRequest)).rejects.toBeInstanceOf(errors_js_1.UserFacingError);
        expect(metrics_js_1.graphragSchemaFailuresTotal.get().values[0].value).toBe(2);
    });
});
//# sourceMappingURL=graphragService.test.js.map