"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomSchema = getCustomSchema;
exports.setCustomSchema = setCustomSchema;
exports.buildValidator = buildValidator;
exports.validateCustomMetadata = validateCustomMetadata;
const zod_1 = require("zod");
const postgres_js_1 = require("../db/postgres.js");
const redis_js_1 = require("../db/redis.js");
const CACHE_PREFIX = "investigation:customSchema:";
const CACHE_TTL_SECONDS = 3600;
async function getCustomSchema(investigationId) {
    const redis = (0, redis_js_1.getRedisClient)();
    const cacheKey = `${CACHE_PREFIX}${investigationId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
        try {
            return JSON.parse(cached);
        }
        catch {
            // ignore parse errors
        }
    }
    const pool = (0, postgres_js_1.getPostgresPool)();
    const res = await pool.query("SELECT custom_schema FROM investigations WHERE id = $1", [investigationId]);
    const schema = res.rows[0]?.custom_schema || [];
    await redis.set(cacheKey, JSON.stringify(schema), "EX", CACHE_TTL_SECONDS);
    return schema;
}
async function setCustomSchema(investigationId, schema) {
    const pool = (0, postgres_js_1.getPostgresPool)();
    await pool.query("UPDATE investigations SET custom_schema = $1 WHERE id = $2", [JSON.stringify(schema), investigationId]);
    const redis = (0, redis_js_1.getRedisClient)();
    await redis.set(`${CACHE_PREFIX}${investigationId}`, JSON.stringify(schema), "EX", CACHE_TTL_SECONDS);
}
function buildValidator(schema) {
    const shape = {};
    for (const field of schema) {
        switch (field.type) {
            case "string":
                shape[field.name] = zod_1.z.string().optional();
                break;
            case "number":
                shape[field.name] = zod_1.z.number().optional();
                break;
            case "enum":
                if (field.options) {
                    shape[field.name] = zod_1.z.enum(field.options).optional();
                }
                break;
        }
    }
    return zod_1.z.object(shape).passthrough();
}
async function validateCustomMetadata(investigationId, data) {
    const schema = await getCustomSchema(investigationId);
    if (!schema || schema.length === 0)
        return;
    const validator = buildValidator(schema);
    validator.parse(data);
}
//# sourceMappingURL=CustomSchemaService.js.map