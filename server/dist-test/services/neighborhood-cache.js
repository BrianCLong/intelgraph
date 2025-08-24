"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeighborhoodCache = void 0;
const metrics_js_1 = require("../monitoring/metrics.js");
const database_js_1 = require("../config/database.js");
const GraphOpsService_js_1 = require("./GraphOpsService.js");
class NeighborhoodCache {
    constructor(redis, ttl = 300) {
        this.redis = redis;
        this.hits = 0;
        this.total = 0;
        this.ttl = ttl;
        this.startBackgroundSync();
    }
    startBackgroundSync() {
        Promise.resolve().then(() => __importStar(require("node-cron"))).then((cron) => {
            cron.schedule("0 * * * *", async () => {
                const driver = (0, database_js_1.getNeo4jDriver)();
                const session = driver.session();
                try {
                    const ctxRes = await session.run("MATCH (n:Entity) RETURN DISTINCT n.tenantId AS tenantId, n.investigationId AS investigationId");
                    for (const record of ctxRes.records) {
                        const tenantId = record.get("tenantId");
                        const investigationId = record.get("investigationId");
                        if (!tenantId || !investigationId)
                            continue;
                        const topRes = await session.run(`MATCH (e:Entity {tenantId: $tenantId, investigationId: $investigationId})-[r]-(m:Entity {tenantId: $tenantId, investigationId: $investigationId})
                 RETURN e.id AS id, count(r) AS score
                 ORDER BY score DESC
                 LIMIT 10`, { tenantId, investigationId });
                        for (const rec of topRes.records) {
                            const entityId = rec.get("id");
                            const graph = await (0, GraphOpsService_js_1.expandNeighborhood)(entityId, 2, {
                                tenantId,
                                investigationId,
                            });
                            await this.set(tenantId, investigationId, entityId, 2, graph);
                        }
                    }
                }
                catch (err) {
                    console.error("Neighborhood cache prewarm failed", err);
                }
                finally {
                    await session.close();
                }
            });
        })
            .catch((err) => {
            console.error("node-cron not available, skipping neighborhood prewarm", err);
        });
    }
    key(tenantId, investigationId, entityId, radius) {
        return `nbhd:${tenantId}:${investigationId}:${entityId}:${radius}`;
    }
    tagKey(tenantId, investigationId, entityId) {
        return `nbhd:tag:${tenantId}:${investigationId}:${entityId}`;
    }
    async get(tenantId, investigationId, entityId, radius) {
        const key = this.key(tenantId, investigationId, entityId, radius);
        const start = Date.now();
        const cached = await this.redis.get(key);
        metrics_js_1.neighborhoodCacheLatencyMs.observe(Date.now() - start);
        this.total++;
        if (cached) {
            this.hits++;
            metrics_js_1.neighborhoodCacheHitRatio.set(this.hits / this.total);
            return JSON.parse(cached);
        }
        metrics_js_1.neighborhoodCacheHitRatio.set(this.hits / this.total);
        return null;
    }
    async set(tenantId, investigationId, entityId, radius, data) {
        const key = this.key(tenantId, investigationId, entityId, radius);
        await this.redis.set(key, JSON.stringify(data), "EX", this.ttl);
        const ids = new Set([entityId, ...data.nodes.map((n) => n.id)]);
        for (const id of ids) {
            await this.redis.sadd(this.tagKey(tenantId, investigationId, id), key);
        }
    }
    async invalidate(tenantId, investigationId, entityIds) {
        for (const id of entityIds) {
            const tKey = this.tagKey(tenantId, investigationId, id);
            const keys = await this.redis.smembers(tKey);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            await this.redis.del(tKey);
        }
    }
}
exports.NeighborhoodCache = NeighborhoodCache;
exports.default = NeighborhoodCache;
//# sourceMappingURL=neighborhood-cache.js.map