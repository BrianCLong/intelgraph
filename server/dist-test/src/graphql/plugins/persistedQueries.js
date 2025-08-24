"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistedQueriesPlugin = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let allowedOperationIds = new Set();
// Load persisted operations manifest from multiple candidate paths
const candidates = [
    process.env.PERSISTED_MANIFEST,
    path_1.default.resolve(process.cwd(), '../client/src/generated/graphql.json'),
    path_1.default.resolve(process.cwd(), './client/src/generated/graphql.json'),
    path_1.default.resolve(process.cwd(), './persisted-operations.json'),
].filter(Boolean);
for (const p of candidates) {
    try {
        const raw = fs_1.default.readFileSync(p, 'utf8');
        const manifest = JSON.parse(raw);
        const ids = Object.keys(manifest);
        if (ids.length) {
            allowedOperationIds = new Set(ids);
            console.log(`Loaded ${ids.length} persisted operations from ${p}`);
            break;
        }
    }
    catch (error) {
        // Continue to next candidate
    }
}
exports.persistedQueriesPlugin = {
    async requestDidStart() {
        return {
            async didResolveOperation(ctx) {
                // Enforce only in production or when explicitly enabled
                if (process.env.PERSISTED_QUERIES !== '1' && process.env.NODE_ENV !== 'production') {
                    return;
                }
                const opId = ctx.request.http?.headers.get('x-apollo-operation-id');
                if (!opId || !allowedOperationIds.has(opId)) {
                    throw new Error('Unknown persisted operation');
                }
            },
        };
    },
};
//# sourceMappingURL=persistedQueries.js.map