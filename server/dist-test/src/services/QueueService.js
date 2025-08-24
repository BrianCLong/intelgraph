"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialQueue = void 0;
exports.startWorkers = startWorkers;
exports.enqueueSocial = enqueueSocial;
const bullmq_1 = require("bullmq");
const index_js_1 = __importDefault(require("../config/index.js"));
const SocialService_js_1 = __importDefault(require("./SocialService.js"));
const connection = {
    host: index_js_1.default.redis.host,
    port: index_js_1.default.redis.port,
    password: index_js_1.default.redis.password,
    db: index_js_1.default.redis.db,
};
exports.socialQueue = new bullmq_1.Queue("social:ingest", { connection });
function startWorkers() {
    const worker = new bullmq_1.Worker("social:ingest", async (job) => {
        const { provider, query, investigationId, host, limit } = job.data || {};
        const svc = new SocialService_js_1.default();
        return await svc.queryProvider(provider, query, investigationId, {
            host,
            limit,
        });
    }, { connection });
    return worker;
}
async function enqueueSocial(provider, query, investigationId, options = {}) {
    const job = await exports.socialQueue.add("ingest", { provider, query, investigationId, ...options }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
    return job.id;
}
//# sourceMappingURL=QueueService.js.map