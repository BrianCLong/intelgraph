"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIResolvers = void 0;
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const logger_1 = __importDefault(require("../utils/logger"));
const policyWrapper_1 = require("./policyWrapper");
const ML_URL = process.env.ML_URL || "http://intelgraph-ml:8081";
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
const JWT_ALGO = "RS256";
async function mlCall(path, payload, ctx) {
    const token = jsonwebtoken_1.default.sign({ sub: ctx.user.id, roles: ctx.user.roles }, JWT_PRIVATE_KEY, { algorithm: JWT_ALGO, expiresIn: "5m" });
    try {
        const { data } = await axios_1.default.post(`${ML_URL}${path}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return data;
    }
    catch (err) {
        logger_1.default.error("ML request failed", { path, error: err.message });
        throw err;
    }
}
const resolvers = {
    Query: {
        aiJob: async (_, { id }, { db }) => db.jobs.findById(id),
        insights: async (_, { status, kind }, { db }) => db.insights.findMany({ status, kind }),
    },
    Mutation: {
        aiExtractEntities: async (_, { docs, jobId }, ctx) => queueJob(ctx, "nlp_entities", "/nlp/entities", { docs }, jobId),
        aiResolveEntities: async (_, { records, threshold, jobId }, ctx) => queueJob(ctx, "entity_resolution", "/er/resolve", { records, threshold }, jobId),
        aiLinkPredict: async (_, { graphSnapshotId, topK, jobId }, ctx) => {
            const edges = await fetchEdgesForSnapshot(ctx.neo4j, graphSnapshotId);
            return queueJob(ctx, "link_prediction", "/graph/link_predict", { graph_snapshot_id: graphSnapshotId, top_k: topK, edges }, jobId);
        },
        aiCommunityDetect: async (_, { graphSnapshotId, jobId }, ctx) => {
            const edges = await fetchEdgesForSnapshot(ctx.neo4j, graphSnapshotId);
            return queueJob(ctx, "community_detect", "/graph/community_detect", { graph_snapshot_id: graphSnapshotId, edges }, jobId);
        },
        approveInsight: async (_, { id }, { db, user }) => decideInsight(db, id, "APPROVED", user.id),
        rejectInsight: async (_, { id, reason }, { db, user }) => decideInsight(db, id, "REJECTED", user.id, reason),
    },
    Subscription: {
        aiJobProgress: {
            subscribe: (_, { jobId }, { subscriptions }) => subscriptions.asyncIterator(`AI_JOB_${jobId}`),
            resolve: (p) => p,
        },
        insightAdded: {
            subscribe: (_, { status, kind }, { subscriptions }) => subscriptions.asyncIterator(`INSIGHT_${status || "*"}_${kind || "*"}`),
            resolve: (p) => p,
        },
    },
};
exports.AIResolvers = (0, policyWrapper_1.wrapResolversWithPolicy)("AI", resolvers);
async function queueJob(ctx, kind, path, body, jobId) {
    const id = jobId || (0, uuid_1.v4)();
    const callbackUrl = `${ctx.config.publicBaseUrl}/ai/webhook`;
    const createdAt = new Date().toISOString();
    await ctx.db.jobs.insert({
        id,
        kind,
        status: "QUEUED",
        createdAt,
        meta: { ...body },
    });
    try {
        await mlCall(path, { ...body, job_id: id, callback_url: callbackUrl }, ctx);
    }
    catch (err) {
        await ctx.db.jobs.update(id, {
            status: "FAILED",
            error: err.message,
            updatedAt: new Date().toISOString(),
        });
        logger_1.default.error("AI job failed", { id, kind, error: err.message });
        throw err;
    }
    return { id, kind, status: "QUEUED", createdAt };
}
async function fetchEdgesForSnapshot(neo4j, snapshotId) {
    const session = neo4j.session();
    try {
        const res = await session.run(`MATCH (a)-[r]->(b) WHERE r.snapshotId = $snapshotId RETURN a.id as u, b.id as v`, { snapshotId });
        return res.records.map((rec) => [rec.get("u"), rec.get("v")]);
    }
    finally {
        await session.close();
    }
}
async function decideInsight(db, id, status, userId, reason) {
    const now = new Date().toISOString();
    const ins = await db.insights.update(id, {
        status,
        decidedAt: now,
        decidedBy: userId,
    });
    await db.audit.insert({
        id: (0, uuid_1.v4)(),
        type: "INSIGHT_DECISION",
        actorId: userId,
        createdAt: now,
        meta: { insightId: id, status, reason },
    });
    await db.feedback.insert({
        id: (0, uuid_1.v4)(),
        insightId: id,
        decision: status,
        createdAt: now,
    });
    return ins;
}
//# sourceMappingURL=ai.js.map