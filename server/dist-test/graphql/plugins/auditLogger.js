"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const lodash_1 = require("lodash");
const ELASTIC_URL = process.env.ELASTICSEARCH_URL;
const LOG_FILE = process.env.AUDIT_LOG_FILE || "audit-log.jsonl";
const ANONYMIZE = process.env.AUDIT_LOG_ANONYMIZE === "true";
const anonymize = (value) => {
    if (value === null || value === undefined)
        return value;
    if (typeof value === "object") {
        if (Array.isArray(value)) {
            return value.map(() => "[redacted]");
        }
        return Object.keys(value).reduce((acc, key) => ({ ...acc, [key]: anonymize(value[key]) }), {});
    }
    return "[redacted]";
};
const auditLoggerPlugin = {
    async requestDidStart() {
        const start = new Date();
        return {
            async willSendResponse(ctx) {
                const operation = ctx.operation;
                if (!operation || operation.operation !== "mutation") {
                    return;
                }
                const entity = operation.selectionSet.selections[0]?.name?.value ||
                    "unknown";
                const userId = ctx.contextValue?.user?.id ?? null;
                const before = ctx.contextValue?.audit?.before;
                const after = ctx.contextValue?.audit?.after ||
                    (ctx.response.body.kind === "single"
                        ? ctx.response.body.singleResult?.data?.[entity]
                        : undefined);
                const diff = {};
                if (before &&
                    after &&
                    typeof before === "object" &&
                    typeof after === "object") {
                    const keys = new Set([
                        ...Object.keys(before),
                        ...Object.keys(after),
                    ]);
                    for (const key of keys) {
                        const b = before[key];
                        const a = after[key];
                        if (!(0, lodash_1.isEqual)(b, a)) {
                            diff[key] = {
                                before: ANONYMIZE ? anonymize(b) : b,
                                after: ANONYMIZE ? anonymize(a) : a,
                            };
                        }
                    }
                }
                const logEntry = {
                    timestamp: start.toISOString(),
                    userId: ANONYMIZE ? anonymize(userId) : userId,
                    operation: operation.operation,
                    entity,
                    diff,
                };
                try {
                    if (ELASTIC_URL) {
                        await axios_1.default.post(`${ELASTIC_URL}/audit/_doc`, logEntry, {
                            timeout: 2000,
                        });
                    }
                    else {
                        throw new Error("No Elasticsearch URL");
                    }
                }
                catch (_err) {
                    fs_1.default.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
                }
            },
        };
    },
};
exports.default = auditLoggerPlugin;
//# sourceMappingURL=auditLogger.js.map