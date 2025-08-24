"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFacingError = void 0;
exports.mapGraphRAGError = mapGraphRAGError;
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const logger = logger.child({ name: "ErrorMapper" });
class UserFacingError extends Error {
    constructor(message, statusCode, traceId) {
        super(message);
        this.statusCode = statusCode;
        this.traceId = traceId;
    }
}
exports.UserFacingError = UserFacingError;
function mapGraphRAGError(error) {
    const traceId = (0, uuid_1.v4)();
    let summary = "Unknown error";
    if (error instanceof zod_1.ZodError) {
        summary = error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
    }
    else if (error instanceof Error) {
        summary = error.message;
    }
    logger.warn({ traceId, issues: summary }, "GraphRAG schema validation failed");
    return new UserFacingError(`Invalid GraphRAG response. Trace ID: ${traceId}`, 400, traceId);
}
//# sourceMappingURL=errors.js.map