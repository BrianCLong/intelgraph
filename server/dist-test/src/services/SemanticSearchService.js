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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EmbeddingService_js_1 = __importDefault(require("./EmbeddingService.js"));
const logger_1 = __importDefault(require("../config/logger"));
class SemanticSearchService {
    constructor(client, embeddingService) {
        this.logger = logger_1.default.child({ name: "SemanticSearchService" });
        this.client = client || null;
        this.embeddingService = embeddingService || new EmbeddingService_js_1.default();
        this.indexName = process.env.WEAVIATE_INDEX || "IngestedDocument";
    }
    async getClient() {
        if (this.client)
            return this.client;
        try {
            const weaviate = await Promise.resolve().then(() => __importStar(require("weaviate-ts-client")));
            const apiKey = process.env.WEAVIATE_API_KEY
                ? new weaviate.ApiKey(process.env.WEAVIATE_API_KEY)
                : undefined;
            this.client = weaviate.client({
                scheme: process.env.WEAVIATE_SCHEME || "http",
                host: process.env.WEAVIATE_HOST || "localhost:8080",
                apiKey,
            });
            return this.client;
        }
        catch (err) {
            this.logger.error({ err }, "Failed to initialize Weaviate client");
            throw new Error("Weaviate client not available");
        }
    }
    async indexDocument(doc) {
        const client = await this.getClient();
        const vector = await this.embeddingService.generateEmbedding({
            text: doc.text,
        });
        await client.data
            .creator()
            .withClassName(this.indexName)
            .withId(doc.id)
            .withVector(vector)
            .withProperties({
            text: doc.text,
            graphId: doc.graphId,
            source: doc.source,
            date: doc.date,
            threatLevel: doc.threatLevel,
        })
            .do();
    }
    async search(query, filters = {}, limit = 10) {
        const client = await this.getClient();
        const vector = await this.embeddingService.generateEmbedding({
            text: query,
        });
        const operands = [];
        if (filters.source) {
            operands.push({
                path: ["source"],
                operator: "Equal",
                valueString: filters.source,
            });
        }
        if (filters.threatLevel !== undefined) {
            operands.push({
                path: ["threatLevel"],
                operator: "Equal",
                valueInt: filters.threatLevel,
            });
        }
        if (filters.dateFrom) {
            operands.push({
                path: ["date"],
                operator: "GreaterThanEqual",
                valueDate: filters.dateFrom,
            });
        }
        if (filters.dateTo) {
            operands.push({
                path: ["date"],
                operator: "LessThanEqual",
                valueDate: filters.dateTo,
            });
        }
        const where = operands.length > 0 ? { operator: "And", operands } : undefined;
        const result = await client.graphql
            .get()
            .withClassName(this.indexName)
            .withFields("id text source date threatLevel graphId _additional { distance }")
            .withNearVector({ vector })
            .withWhere(where)
            .withLimit(limit)
            .do();
        const docs = result?.data?.Get?.[this.indexName] || [];
        return docs.map((d) => ({
            id: d.id,
            text: d.text,
            score: 1 - (d._additional?.distance ?? 0),
            metadata: {
                source: d.source,
                date: d.date,
                threatLevel: d.threatLevel,
                graphId: d.graphId,
            },
        }));
    }
}
exports.default = SemanticSearchService;
//# sourceMappingURL=SemanticSearchService.js.map