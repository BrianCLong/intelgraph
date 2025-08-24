"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("../resolvers/ai");
const uuid_1 = require("uuid");
const globals_1 = require("@jest/globals");
// Mock dependencies
globals_1.jest.mock("axios");
globals_1.jest.mock("jsonwebtoken");
globals_1.jest.mock("../realtime/pubsub");
const mockAxios = require("axios");
const mockJwt = require("jsonwebtoken");
const mockPubsub = require("../realtime/pubsub");
describe("AI Integration", () => {
    let mockContext;
    let mockDb;
    let mockNeo4j;
    beforeEach(() => {
        // Setup mock database
        mockDb = {
            jobs: {
                insert: globals_1.jest.fn(),
                findById: globals_1.jest.fn(),
                update: globals_1.jest.fn()
            },
            insights: {
                insert: globals_1.jest.fn(),
                findMany: globals_1.jest.fn(),
                update: globals_1.jest.fn(),
                markApplied: globals_1.jest.fn()
            },
            audit: {
                insert: globals_1.jest.fn()
            },
            feedback: {
                insert: globals_1.jest.fn()
            }
        };
        // Setup mock Neo4j
        mockNeo4j = {
            session: globals_1.jest.fn(() => ({
                run: globals_1.jest.fn().mockResolvedValue({
                    records: [
                        { get: globals_1.jest.fn().mockReturnValueOnce("node1").mockReturnValueOnce("node2") },
                        { get: globals_1.jest.fn().mockReturnValueOnce("node3").mockReturnValueOnce("node4") }
                    ]
                }),
                close: globals_1.jest.fn()
            }))
        };
        // Setup mock context
        mockContext = {
            user: { id: "user123", roles: ["analyst"] },
            db: mockDb,
            neo4j: mockNeo4j,
            config: { publicBaseUrl: "http://localhost:4000" }
        };
        // Setup mock responses
        mockJwt.sign.mockReturnValue("mock-jwt-token");
        mockAxios.post.mockResolvedValue({ data: { queued: true, task_id: "task123" } });
    });
    afterEach(() => {
        globals_1.jest.clearAllMocks();
    });
    describe("Entity Extraction", () => {
        it("should queue entity extraction job", async () => {
            const docs = [{ id: "doc1", text: "Test document with entities" }];
            const jobId = (0, uuid_1.v4)();
            const result = await ai_1.AIResolvers.Mutation.aiExtractEntities(null, { docs, jobId }, mockContext);
            expect(mockDb.jobs.insert).toHaveBeenCalledWith({
                id: jobId,
                kind: "nlp_entities",
                status: "QUEUED",
                createdAt: expect.any(String),
                meta: expect.objectContaining({ docs })
            });
            expect(mockAxios.post).toHaveBeenCalledWith("http://intelgraph-ml:8081/nlp/entities", expect.objectContaining({
                docs,
                job_id: jobId,
                callback_url: "http://localhost:4000/ai/webhook"
            }), expect.objectContaining({
                headers: { Authorization: "Bearer mock-jwt-token" }
            }));
            expect(result).toEqual({
                id: jobId,
                kind: "nlp_entities",
                status: "QUEUED",
                createdAt: expect.any(String)
            });
        });
    });
    describe("Entity Resolution", () => {
        it("should queue entity resolution job", async () => {
            const records = [
                { id: "e1", name: "John Smith" },
                { id: "e2", name: "J. Smith" }
            ];
            const threshold = 0.85;
            const result = await ai_1.AIResolvers.Mutation.aiResolveEntities(null, { records, threshold }, mockContext);
            expect(mockDb.jobs.insert).toHaveBeenCalled();
            expect(mockAxios.post).toHaveBeenCalledWith("http://intelgraph-ml:8081/er/resolve", expect.objectContaining({ records, threshold }), expect.any(Object));
            expect(result.kind).toBe("entity_resolution");
        });
    });
    describe("Link Prediction", () => {
        it("should fetch graph edges and queue link prediction", async () => {
            const graphSnapshotId = "snapshot123";
            const topK = 10;
            const result = await ai_1.AIResolvers.Mutation.aiLinkPredict(null, { graphSnapshotId, topK }, mockContext);
            // Verify graph edges were fetched
            expect(mockNeo4j.session).toHaveBeenCalled();
            // Verify job was queued
            expect(mockDb.jobs.insert).toHaveBeenCalled();
            expect(mockAxios.post).toHaveBeenCalledWith("http://intelgraph-ml:8081/graph/link_predict", expect.objectContaining({
                graph_snapshot_id: graphSnapshotId,
                top_k: topK,
                edges: expect.any(Array)
            }), expect.any(Object));
            expect(result.kind).toBe("link_prediction");
        });
    });
    describe("Community Detection", () => {
        it("should fetch graph edges and queue community detection", async () => {
            const graphSnapshotId = "snapshot456";
            const result = await ai_1.AIResolvers.Mutation.aiCommunityDetect(null, { graphSnapshotId }, mockContext);
            expect(mockNeo4j.session).toHaveBeenCalled();
            expect(mockDb.jobs.insert).toHaveBeenCalled();
            expect(mockAxios.post).toHaveBeenCalledWith("http://intelgraph-ml:8081/graph/community_detect", expect.objectContaining({
                graph_snapshot_id: graphSnapshotId,
                edges: expect.any(Array)
            }), expect.any(Object));
            expect(result.kind).toBe("community_detect");
        });
    });
    describe("Insight Management", () => {
        it("should approve insight and create audit trail", async () => {
            const insightId = (0, uuid_1.v4)();
            const userId = "user123";
            mockDb.insights.update.mockResolvedValue({
                id: insightId,
                status: "APPROVED",
                decidedAt: expect.any(String),
                decidedBy: userId
            });
            const result = await ai_1.AIResolvers.Mutation.approveInsight(null, { id: insightId }, { db: mockDb, user: { id: userId } });
            expect(mockDb.insights.update).toHaveBeenCalledWith(insightId, expect.objectContaining({
                status: "APPROVED",
                decidedBy: userId
            }));
            expect(mockDb.audit.insert).toHaveBeenCalledWith(expect.objectContaining({
                type: "INSIGHT_DECISION",
                actorId: userId,
                meta: expect.objectContaining({
                    insightId,
                    status: "APPROVED"
                })
            }));
            expect(mockDb.feedback.insert).toHaveBeenCalled();
        });
        it("should reject insight with reason", async () => {
            const insightId = (0, uuid_1.v4)();
            const userId = "user123";
            const reason = "Insufficient confidence";
            mockDb.insights.update.mockResolvedValue({
                id: insightId,
                status: "REJECTED",
                decidedAt: expect.any(String),
                decidedBy: userId
            });
            const result = await ai_1.AIResolvers.Mutation.rejectInsight(null, { id: insightId, reason }, { db: mockDb, user: { id: userId } });
            expect(mockDb.insights.update).toHaveBeenCalledWith(insightId, expect.objectContaining({
                status: "REJECTED",
                decidedBy: userId
            }));
            expect(mockDb.audit.insert).toHaveBeenCalledWith(expect.objectContaining({
                meta: expect.objectContaining({
                    reason
                })
            }));
        });
    });
    describe("Query Operations", () => {
        it("should retrieve AI job by ID", async () => {
            const jobId = (0, uuid_1.v4)();
            const mockJob = {
                id: jobId,
                kind: "nlp_entities",
                status: "SUCCESS",
                createdAt: "2023-01-01T00:00:00Z"
            };
            mockDb.jobs.findById.mockResolvedValue(mockJob);
            const result = await ai_1.AIResolvers.Query.aiJob(null, { id: jobId }, { db: mockDb });
            expect(mockDb.jobs.findById).toHaveBeenCalledWith(jobId);
            expect(result).toEqual(mockJob);
        });
        it("should retrieve insights with filters", async () => {
            const mockInsights = [
                {
                    id: (0, uuid_1.v4)(),
                    kind: "link_prediction",
                    status: "PENDING",
                    payload: [{ u: "a", v: "b", score: 0.95 }]
                }
            ];
            mockDb.insights.findMany.mockResolvedValue(mockInsights);
            const result = await ai_1.AIResolvers.Query.insights(null, { status: "PENDING", kind: "link_prediction" }, { db: mockDb });
            expect(mockDb.insights.findMany).toHaveBeenCalledWith({
                status: "PENDING",
                kind: "link_prediction"
            });
            expect(result).toEqual(mockInsights);
        });
    });
    describe("Error Handling", () => {
        it("should handle ML service errors gracefully", async () => {
            mockAxios.post.mockRejectedValue(new Error("ML service unavailable"));
            await expect(ai_1.AIResolvers.Mutation.aiExtractEntities(null, { docs: [{ id: "doc1", text: "test" }] }, mockContext)).rejects.toThrow("ML service unavailable");
            // Job should still be inserted and marked failed if ML service fails
            expect(mockDb.jobs.insert).toHaveBeenCalled();
            expect(mockDb.jobs.update).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ status: "FAILED", error: "ML service unavailable" }));
        });
        it("should handle database errors", async () => {
            mockDb.jobs.insert.mockRejectedValue(new Error("Database error"));
            await expect(ai_1.AIResolvers.Mutation.aiExtractEntities(null, { docs: [{ id: "doc1", text: "test" }] }, mockContext)).rejects.toThrow("Database error");
        });
        it("should handle Neo4j errors in graph operations", async () => {
            mockNeo4j.session.mockImplementation(() => ({
                run: globals_1.jest.fn().mockRejectedValue(new Error("Neo4j connection failed")),
                close: globals_1.jest.fn()
            }));
            await expect(ai_1.AIResolvers.Mutation.aiLinkPredict(null, { graphSnapshotId: "snap1", topK: 10 }, mockContext)).rejects.toThrow("Neo4j connection failed");
        });
    });
});
//# sourceMappingURL=ai.integration.test.js.map